// ============================================================
// Post Card Component
// ============================================================
import { users, currentUser } from '../data/mockData.js';
import { getInitials, getAvatarColor, timeAgo } from '../utils/helpers.js';

export function renderPostCard(post) {
  const author = users.find(u => u.id === post.userId);
  const authorName = post.isAnonymous ? '匿名ユーザー' : (author?.name || '不明');
  const color = post.isAnonymous ? '#64748b' : getAvatarColor(post.userId);
  const initials = post.isAnonymous ? '匿' : getInitials(authorName);
  const isActivity = post.type === 'activity';
  const typeBadge = isActivity
    ? `<span class="post-type-badge post-type-activity">📢 アクティビティ</span>`
    : `<span class="post-type-badge post-type-question">❓ 質問</span>`;

  const isOwnPost = post.userId === currentUser.id;
  const deleteBtn = isOwnPost 
    ? `<button class="post-delete-btn" data-post-id="${post.id}" title="削除">🗑️</button>` 
    : '';

  const repliesHtml = post.comments && post.comments.length > 0
    ? post.comments.map(c => {
        const cAuthor = users.find(u => u.id === c.userId);
        const cName = c.isAnonymous ? '匿名ユーザー' : (cAuthor?.name || '不明');
        const cColor = c.isAnonymous ? '#64748b' : getAvatarColor(c.userId);
        const cInitials = c.isAnonymous ? '匿' : getInitials(cName);
        return `<div class="post-reply" style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.12);"><div class="avatar avatar-sm" style="background:${cColor};width:24px;height:24px;font-size:0.7rem;">${cInitials}</div><div class="reply-content" style="flex:1;"><div class="reply-header" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;"><span class="reply-name" style="font-size:0.8rem;font-weight:600;color:var(--color-text-secondary);">${cName}</span><span class="reply-time" style="font-size:0.7rem;color:var(--color-text-tertiary);">${timeAgo(c.createdAt)}</span></div><div class="reply-body" style="font-size:0.85rem;color:var(--color-text-primary);line-height:1.4;">${c.body}</div></div></div>`;
      }).join('')
    : '';

  const commentsHtml = post.type === 'question' ? `<div class="post-replies-section" style="margin-top:16px;">
      ${repliesHtml ? `<div class="post-replies-list">${repliesHtml}</div>` : ''}
      <div class="post-reply-input-wrapper" style="display:flex;gap:8px;margin-top:12px;">
        <input type="text" class="post-reply-input" placeholder="返信を入力..." style="flex:1;font-size:0.85rem;padding:6px 10px;border-radius:var(--radius-sm);border:1px solid rgba(148,163,184,0.2);background:var(--color-bg-base);color:white;" />
        <button class="btn btn-primary btn-sm btn-submit-reply" data-post-id="${post.id}">送信</button>
      </div>
    </div>` : '';

  return `
    <article class="post-card animate-slide-up" id="${post.id}">
      <div class="post-card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="display:flex; gap:12px;">
          <div class="avatar" style="background:${color}">${initials}</div>
          <div class="post-author-info">
            <div class="post-author-name">${authorName} ${typeBadge}</div>
            <div class="post-author-meta">${timeAgo(post.createdAt)}</div>
          </div>
        </div>
        ${deleteBtn}
      </div>
      ${post.title ? `<h3 class="post-card-title">${post.title}</h3>` : ''}
      <div class="post-card-body">${post.body}</div>
      <div class="post-card-actions">
        <button class="post-action" data-action="like" data-post-id="${post.id}">
          ❤️ <span>${post.likes}</span>
        </button>
        <button class="post-action" data-action="comment" data-post-id="${post.id}">
          💬 <span>${post.comments?.length || 0}</span>
        </button>
      </div>
      ${commentsHtml}
    </article>
  `;
}
