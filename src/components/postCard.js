// ============================================================
// Post Card Component
// ============================================================
import { users } from '../data/mockData.js';
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

  const commentsHtml = post.comments && post.comments.length > 0
    ? `<div class="post-comments">
        <div class="post-comments-header">💬 ${post.comments.length}件の回答</div>
        ${post.comments.map(c => {
          const cAuthor = users.find(u => u.id === c.userId);
          const cName = c.isAnonymous ? '匿名ユーザー' : (cAuthor?.name || '不明');
          const cColor = c.isAnonymous ? '#64748b' : getAvatarColor(c.userId);
          const cInitials = c.isAnonymous ? '匿' : getInitials(cName);
          return `<div class="comment-item">
            <div class="avatar avatar-sm" style="background:${cColor}">${cInitials}</div>
            <div class="comment-content">
              <div class="comment-author">${cName}</div>
              <div class="comment-body">${c.body}</div>
              <div class="comment-time">${timeAgo(c.createdAt)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`
    : '';

  return `
    <article class="post-card animate-slide-up" id="${post.id}">
      <div class="post-card-header">
        <div class="avatar" style="background:${color}">${initials}</div>
        <div class="post-author-info">
          <div class="post-author-name">${authorName} ${typeBadge}</div>
          <div class="post-author-meta">${timeAgo(post.createdAt)}</div>
        </div>
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
