
export const mapLinkUrl = (linkUrl: string | undefined, role: string): string | null => {
    if (!linkUrl) return null;

    // /complaints/{id} 또는 /inquiries/{id} 패턴 매핑
    if (linkUrl.startsWith('/complaints/')) {
        return role === 'admin' ? '/admin/complaints' : '/guardian/complaint';
    }
    if (linkUrl.startsWith('/inquiries/')) {
        return role === 'admin' ? '/admin/members' : '/guardian/inquiry';
    }
    if (linkUrl.startsWith('/admin/complaints/')) {
        return '/admin/complaints';
    }
    if (linkUrl.startsWith('/admin/inquiries/')) {
        return '/admin/members';
    }
    // 공지사항
    if (linkUrl.startsWith('/notices/')) {
        if (role === 'admin') return '/admin/notices';
        if (role === 'counselor') return '/counselor/notices';
        return '/guardian/notices';
    }
    // 민감정보 열람 요청
    if (linkUrl.startsWith('/admin/access-requests/') || linkUrl.startsWith('/access-requests/')) {
        if (role === 'admin') return '/admin/sensitive-info';
        if (role === 'guardian') return '/guardian/sensitive-info';
        if (role === 'counselor') return '/counselor/sensitive-info';
        return null;
    }

    // [Redirect] Move problematic assignment links to notification history
    if (role === 'counselor' && linkUrl.startsWith('/counselor/elderly/')) {
        return '/counselor/notifications';
    }

    // 그 외는 원본 linkUrl 사용
    return linkUrl;
};
