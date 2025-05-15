// Post interaction functions
function editPost(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    const contentElement = postElement.querySelector('.post-text');
    const currentContent = contentElement.textContent.trim();
    
    const newContent = prompt('Edit your post:', currentContent);
    
    if (newContent !== null && newContent !== currentContent) {
        fetch(`/edit-post/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: newContent })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to edit post');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                contentElement.textContent = newContent;
                console.log('Post updated successfully');
            } else {
                console.error('Failed to update post:', data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to edit post. Please try again.');
        });
    }
}

function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        fetch(`/delete-post/${postId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                postElement.remove();
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function likePost(postId) {
    fetch(`/like-post/${postId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        const likeCount = document.querySelector(`[data-post-id="${postId}"] .like-btn span`);
        likeCount.textContent = `${data.likes} Likes`;
    })
    .catch(error => console.error('Error:', error));
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
}

function addComment(event, postId) {
    event.preventDefault();
    const form = event.target;
    const commentInput = form.querySelector('input[name="comment"]');
    const comment = commentInput.value.trim();
    
    if (comment) {
        fetch(`/comment-post/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment })
        })
        .then(response => response.json())
        .then(data => {
            const commentsList = document.querySelector(`[data-post-id="${postId}"] .comments-list`);
            const newCommentElement = document.createElement('div');
            newCommentElement.className = 'comment';
            newCommentElement.innerHTML = `
                <strong>${data.comment.username}:</strong>
                <span>${data.comment.content}</span>
            `;
            commentsList.appendChild(newCommentElement);
            commentInput.value = '';
        })
        .catch(error => console.error('Error:', error));
    }
}

// Image preview before upload
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('post-image');
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.createElement('img');
                preview.src = e.target.result;
                preview.style.maxWidth = '100%';
                preview.style.marginTop = '10px';
                
                const previewContainer = document.querySelector('.post-input-container');
                const existingPreview = previewContainer.querySelector('img');
                if (existingPreview) {
                    existingPreview.remove();
                }
                previewContainer.appendChild(preview);
            };
            reader.readAsDataURL(file);
        }
    });
});

// Profile picture change functionality
document.addEventListener('DOMContentLoaded', function() {
    const profilePicInput = document.getElementById('profile-pic-input');
    const profilePicForm = document.getElementById('profile-pic-form');
    const profileImage = document.getElementById('profile-image');

    if (profilePicInput) {
        profilePicInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const formData = new FormData(profilePicForm);
                
                fetch('/update-profile-pic', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update the profile picture immediately
                        profileImage.src = data.profilePic;
                        
                        // Update profile picture in the navigation if it exists
                        const navProfilePic = document.querySelector('.nav-user-icon img');
                        if (navProfilePic) {
                            navProfilePic.src = data.profilePic;
                        }
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        });
    }
}); 