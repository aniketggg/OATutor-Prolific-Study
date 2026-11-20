import React, { useEffect, useState } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AgentChatbox from './AgentChatbox';

const styles = () => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        background: '#eef4fa',
    },
    chatWrap: {
        flex: 1,
        minHeight: 0,
        width: '100%',
        display: 'flex',
    },
    finishBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        padding: '10px 16px',
        borderTop: '1px solid #DFE8EE',
        background: '#FFFFFF',
    },
    finishHint: {
        color: '#344054',
        fontSize: 14,
    },
});

// Minimum time before a standalone chat inside a meta-lesson can be finished.
// Set per lesson with `chat_min_minutes` in coursePlans.json; unset or 0 = immediately.
function getMinSeconds(lesson) {
    const minutes = Number(lesson?.chat_min_minutes);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0;
}

function formatClock(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function StandaloneChatViewBase({ classes, lesson, onFinish }) {
    const minSeconds = getMinSeconds(lesson);
    const lessonKey = lesson?.metaId || lesson?.id;
    const [remaining, setRemaining] = useState(minSeconds);
    const [finishing, setFinishing] = useState(false);

    // The clock starts when the chat opens; a reload restarts it (never shortens it).
    useEffect(() => {
        setRemaining(minSeconds);
        if (!onFinish || minSeconds === 0) return undefined;
        const startedAt = Date.now();
        const timer = setInterval(() => {
            const left = Math.max(0, minSeconds - Math.floor((Date.now() - startedAt) / 1000));
            setRemaining(left);
            if (left === 0) clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [lessonKey, minSeconds, onFinish]);

    const handleFinish = async () => {
        if (finishing) return;
        setFinishing(true);
        try {
            await onFinish();
        } catch (error) {
            console.error('[StandaloneChatView] finishing the sub-lesson failed', error);
            setFinishing(false);
        }
    };

    return (
        <div className={classes.root}>
            <div className={classes.chatWrap}>
                <AgentChatbox
                    lesson={lesson}
                    mode="embedded"
                    officeHours
                    showEmbeddedHeader={false}
                    condition="office_hours"
                    embeddedHeight="100%"
                />
            </div>
            {onFinish && (
                <div className={classes.finishBar}>
                    {remaining > 0 && (
                        <span className={classes.finishHint}>
                            You can continue in {formatClock(remaining)}
                        </span>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={remaining > 0 || finishing}
                        onClick={handleFinish}
                    >
                        Continue
                    </Button>
                </div>
            )}
        </div>
    );
}

export default withStyles(styles)(StandaloneChatViewBase);
