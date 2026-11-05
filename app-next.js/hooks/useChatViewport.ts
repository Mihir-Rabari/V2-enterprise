'use client';

import { useEffect, useState } from 'react';

/** Keep the mobile dialog inside the visible viewport, including the on-screen keyboard. */
export function useChatViewport(open: boolean) {
    const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
    useEffect(() => {
        if (!open) return;
        const update = () => setViewport(window.innerWidth < 640 ? {
            height: window.visualViewport?.height ?? window.innerHeight,
            top: window.visualViewport?.offsetTop ?? 0,
        } : null);
        update();
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        window.visualViewport?.addEventListener('scroll', update);
        // Fix the document in place rather than letting touch scrolling chain into the product page.
        const y = window.scrollY;
        const x = window.scrollX;
        const body = document.body;
        const previous = { position: body.style.position, top: body.style.top, left: body.style.left,
            width: body.style.width, overflow: body.style.overflow };
        const overscroll = document.documentElement.style.overscrollBehavior;
        Object.assign(body.style, { position: 'fixed', top: `-${y}px`, left: `-${x}px`, width: '100%', overflow: 'hidden' });
        document.documentElement.style.overscrollBehavior = 'none';
        return () => {
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
            Object.assign(body.style, previous);
            document.documentElement.style.overscrollBehavior = overscroll;
            window.scrollTo(x, y);
        };
    }, [open]);
    return viewport;
}
