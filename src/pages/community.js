// ============================================================
// Community / Q&A Page
// ============================================================
import { posts, activityFeed, currentUser } from '../data/mockData.js';
import { saveToStorage } from '../utils/persistence.js';
import { renderPostCard } from '../components/postCard.js';
import { getInitials, getAvatarColor } from '../utils/helpers.js';

export function renderCommunity() {
  const container = document.getElementById('page-container');
  const color = getAvatarColor(currentUser.id);
  const initials = getInitials(currentUser.name);

  const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">質問広場</h1>
      <p class="page-subtitle">仲間と知識を共有し、疑問を解決しよう</p>
    </div>

    <div class="filter-tabs">
      <button class="filter-tab active" data-filter="all">すべて</button>
      <button class="filter-tab" data-filter="question">❓ 質問</button>
      <button class="filter-tab" data-filter="activity">📢 アクティビティ</button>
    </div>

    <div class="community-layout">
      <div class="community-main">
        <div class="post-creator">
          <div class="post-creator-input" id="open-post-modal">
            <div class="avatar" style="background:${color}">${initials}</div>
            <span class="post-creator-placeholder">質問や近況を投稿する...</span>
          </div>
        </div>
        <div class="post-feed" id="post-feed">
          ${sortedPosts.map(p => renderPostCard(p)).join('')}
        </div>
      </div>

      <div class="community-sidebar">
        <div class="card">
          <div class="card-header"><div class="card-title">🔔 最新アクティビティ</div></div>
          <div class="activity-list">
            ${activityFeed.slice(0, 5).map(a => `
              <div class="activity-item">
                <div class="activity-icon">${a.icon}</div>
                <div class="activity-content">
                  <div class="activity-name">${a.name}</div>
                  <div class="activity-action">${a.action}</div>
                </div>
                <div class="activity-time">${a.time}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📊 広場の統計</div></div>
          <div style="display:flex;flex-direction:column;gap:var(--space-md)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">質問数</span>
              <span style="font-weight:700;color:var(--color-accent-blue)">${posts.filter(p => p.type === 'question').length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">回答数</span>
              <span style="font-weight:700;color:var(--color-accent-green)">${posts.reduce((s, p) => s + (p.comments?.length || 0), 0)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">いいね</span>
              <span style="font-weight:700;color:var(--color-accent-pink)">${posts.reduce((s, p) => s + p.likes, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Post Modal -->
    <div class="modal-overlay" id="post-modal" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">新しい投稿</div>
          <button class="modal-close" id="close-post-modal">✕</button>
        </div>
        <div class="modal-body">
          <input type="text" id="post-title-input" placeholder="タイトル（質問の場合）" />
          <textarea id="post-body-input" placeholder="質問内容や近況を書いてください..."></textarea>
        </div>
        <div class="modal-footer">
          <label class="anonymous-toggle">
            <input type="checkbox" id="post-anonymous" /> 匿名で投稿
          </label>
          <button class="btn btn-primary" id="submit-post">投稿する</button>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  const modal = document.getElementById('post-modal');

  document.getElementById('open-post-modal').addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  document.getElementById('close-post-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('submit-post').addEventListener('click', () => {
    const title = document.getElementById('post-title-input').value;
    const body = document.getElementById('post-body-input').value;
    if (body.trim()) {
      const newPost = {
        id: 'post-' + Date.now(),
        userId: currentUser.id,
        groupId: 'group-001',
        type: title ? 'question' : 'activity',
        title: title || null,
        body: body,
        likes: 0,
        isAnonymous: document.getElementById('post_anonymous')?.checked || false,
        createdAt: new Date().toISOString(),
        comments: []
      };
      posts.push(newPost);
      saveToStorage({ posts });
      modal.style.display = 'none';
      renderCommunity();
    }
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      const filtered = filter === 'all' ? sortedPosts : sortedPosts.filter(p => p.type === filter);
      document.getElementById('post-feed').innerHTML = filtered.map(p => renderPostCard(p)).join('');
    });
  });

    // Like buttons & Replies & Deletion
  document.getElementById('post-feed').addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-action="like"]');
    if (likeBtn) {
      likeBtn.classList.toggle('liked');
      const span = likeBtn.querySelector('span');
      const curr = parseInt(span.textContent);
      span.textContent = likeBtn.classList.contains('liked') ? curr + 1 : curr - 1;
    }

    const deleteBtn = e.target.closest('.post-delete-btn');
    if (deleteBtn) {
      const postId = deleteBtn.dataset.postId;
      if (confirm('この投稿を削除しますか？')) {
        const idx = posts.findIndex(p => p.id === postId);
        if (idx !== -1) {
          posts.splice(idx, 1);
          saveToStorage({ posts });
          renderCommunity();
        }
      }
      return;
    }
    
    // Reply submit
    const btnReply = e.target.closest('.btn-submit-reply');
    if (btnReply) {
      const postId = btnReply.dataset.postId;
      const input = btnReply.previousElementSibling;
      const body = input.value.trim();
      if (!body) return;
      
      const post = posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push({
          id: 'c-' + Date.now(),
          postId: postId,
          userId: currentUser.id,
          body: body,
          isAnonymous: false,
          createdAt: new Date().toISOString()
        });
        saveToStorage({ posts });
        renderCommunity();
      }
    }
  });
}
