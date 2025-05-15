document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const postsContainer = document.getElementById('postsContainer');
    const username = localStorage.getItem("username") || "Guest";

    document.getElementById("home-username").textContent = username;

    const currentUser = window.currentUser || 'username';
    const currentUserPicture = window.currentUserPicture || '/default-user.png';

    // Function to fetch and render posts
    function fetchPosts() {
        fetch('/posts')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                postsContainer.innerHTML = '';
                if (!data) return;

                Object.entries(data).forEach(([id, post]) => {
                    const postDiv = document.createElement('div');
                    postDiv.className = 'post';
                    postDiv.dataset.id = id;

                    const userImg = document.createElement('img');
                    userImg.src = post.userPicture || '/default-user.png';
                    userImg.alt = post.user || 'User picture';
                    userImg.className = 'post-user-picture';

                    const userInfoDiv = document.createElement('div');
                    userInfoDiv.className = 'post-user-info';
                    userInfoDiv.appendChild(userImg);

                    postDiv.appendChild(userInfoDiv);

                    const postContentContainer = document.createElement('div');
                    postContentContainer.className = 'post-content-container';

                    const contentP = document.createElement('p');
                    contentP.textContent = post.content;
                    contentP.className = 'post-content';

                    postContentContainer.appendChild(contentP);
                    postDiv.appendChild(postContentContainer);

                    // Reaction container
                    const reactionContainer = document.createElement('div');
                    reactionContainer.className = 'reaction-container';

                    // Reaction buttons
                    const reactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
                    const reactionButtons = {};

                    reactions.forEach(reaction => {
                        const btn = document.createElement('button');
                        btn.className = `reaction-btn reaction-${reaction}`;
                        btn.title = reaction.charAt(0).toUpperCase() + reaction.slice(1);
                        btn.textContent = reaction.charAt(0).toUpperCase(); // Simple text icon
                        reactionContainer.appendChild(btn);
                        reactionButtons[reaction] = btn;
                    });

                    // Reaction count display
                    const reactionCountDisplay = document.createElement('span');
                    reactionCountDisplay.className = 'reaction-count';
                    reactionCountDisplay.textContent = '';
                    reactionContainer.appendChild(reactionCountDisplay);

                    postDiv.appendChild(reactionContainer);

                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'edit-btn';

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.className = 'delete-btn';

                    postDiv.appendChild(editBtn);
                    postDiv.appendChild(deleteBtn);

                    const commentSectionContainer = document.createElement('div');
                    commentSectionContainer.className = 'comment-section-container';
                    postDiv.appendChild(commentSectionContainer);

                    const commentsContainer = document.createElement('div');
                    commentsContainer.className = 'comments-container';
                    commentSectionContainer.appendChild(commentsContainer);

                    const commentInputBar = document.createElement('div');
                    commentInputBar.className = 'comment-input-bar';
                    commentSectionContainer.appendChild(commentInputBar);

                    const addCommentForm = document.createElement('form');
                    addCommentForm.className = 'add-comment-form';

                    const commentInput = document.createElement('input');
                    commentInput.type = 'text';
                    commentInput.placeholder = 'Write a comment...';
                    commentInput.className = 'comment-input';

                    const commentSubmitBtn = document.createElement('button');
                    commentSubmitBtn.type = 'submit';
                    commentSubmitBtn.textContent = 'Post';
                    commentSubmitBtn.className = 'comment-submit-btn';

                    addCommentForm.appendChild(commentInput);
                    addCommentForm.appendChild(commentSubmitBtn);
                    commentInputBar.appendChild(addCommentForm);

                    postsContainer.appendChild(postDiv);

                    // Handling Edit Button for posts
                    editBtn.addEventListener('click', () => {
                        const originalContent = contentP.textContent;
                        const textarea = document.createElement('textarea');
                        textarea.value = originalContent;
                        textarea.className = 'edit-textarea';
                        postDiv.replaceChild(textarea, postContentContainer);

                        const saveBtn = document.createElement('button');
                        saveBtn.textContent = 'Save';
                        saveBtn.className = 'save-btn';

                        const cancelBtn = document.createElement('button');
                        cancelBtn.textContent = 'Cancel';
                        cancelBtn.className = 'cancel-btn';

                        postDiv.replaceChild(saveBtn, editBtn);
                        postDiv.replaceChild(cancelBtn, deleteBtn);

                        saveBtn.addEventListener('click', () => {
                            const newContent = textarea.value.trim();
                            if (newContent === '') {
                                alert('Post content cannot be empty.');
                                return;
                            }
                            fetch(`/posts/${id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ content: newContent })
                            }).then(res => {
                                if (res.ok) {
                                    fetchPosts();
                                } else {
                                    alert('Failed to update post.');
                                }
                            }).catch(() => {
                                alert('Network error while updating post.');
                            });
                        });

                        cancelBtn.addEventListener('click', () => {
                            postDiv.replaceChild(postContentContainer, textarea);
                            postDiv.replaceChild(editBtn, saveBtn);
                            postDiv.replaceChild(deleteBtn, cancelBtn);
                        });
                    });

                    // Handling Delete Button for posts
                    deleteBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to delete this post?')) {
                            fetch(`/posts/${id}`, {
                                method: 'DELETE'
                            }).then(res => {
                                if (res.ok) {
                                    fetchPosts();
                                } else {
                                    alert('Failed to delete post.');
                                }
                            }).catch(() => {
                                alert('Network error while deleting post.');
                            });
                        }
                    });

                    // Fetching comments for the post
                    function fetchComments() {
                        fetch(`/posts/${id}/comments`)
                            .then(response => {
                                if (!response.ok) throw new Error('Network response was not ok');
                                return response.json();
                            })
                            .then(commentsData => {
                                commentsContainer.innerHTML = '';
                                if (!commentsData) return;

                                Object.entries(commentsData).forEach(([commentId, comment]) => {
                                    const commentDiv = document.createElement('div');
                                    commentDiv.className = 'comment';
                                    commentDiv.dataset.id = commentId;

                                    const commentUserInfo = document.createElement('div');
                                    commentUserInfo.className = 'comment-user-info';

                                    const commentUserImg = document.createElement('img');
                                    commentUserImg.src = comment.userPicture || '/default-user.png';
                                    commentUserImg.alt = comment.user || 'User picture';
                                    commentUserImg.className = 'comment-user-picture';

                                    const commentUserName = document.createElement('p');
                                    // Prevent duplicate names in comments
                                    commentUserName.textContent = (comment.user === post.user) ? '' : (comment.user || 'username');
                                    commentUserName.className = 'comment-user';

                                    commentUserInfo.appendChild(commentUserImg);
                                    commentUserInfo.appendChild(commentUserName);

                                    const commentContent = document.createElement('p');
                                    commentContent.textContent = comment.content || '';
                                    commentContent.className = 'comment-content';

                                    const commentEditBtn = document.createElement('button');
                                    commentEditBtn.textContent = 'Edit';
                                    commentEditBtn.className = 'comment-edit-btn';

                                    const commentDeleteBtn = document.createElement('button');
                                    commentDeleteBtn.textContent = 'Delete';
                                    commentDeleteBtn.className = 'comment-delete-btn';

                                    commentDiv.appendChild(commentUserInfo);
                                    commentDiv.appendChild(commentContent);
                                    commentDiv.appendChild(commentEditBtn);
                                    commentDiv.appendChild(commentDeleteBtn);
                                    commentsContainer.appendChild(commentDiv);

                                    // Handling Edit and Delete for Comments
                                    commentEditBtn.addEventListener('click', () => {
                                        const originalContent = commentContent.textContent;
                                        const textarea = document.createElement('textarea');
                                        textarea.value = originalContent;
                                        textarea.className = 'edit-textarea';
                                        commentDiv.replaceChild(textarea, commentContent);

                                        const saveBtn = document.createElement('button');
                                        saveBtn.textContent = 'Save';
                                        saveBtn.className = 'save-btn';

                                        const cancelBtn = document.createElement('button');
                                        cancelBtn.textContent = 'Cancel';
                                        cancelBtn.className = 'cancel-btn';

                                        commentDiv.replaceChild(saveBtn, commentEditBtn);
                                        commentDiv.replaceChild(cancelBtn, commentDeleteBtn);

                                        saveBtn.addEventListener('click', () => {
                                            const newContent = textarea.value.trim();
                                            if (newContent === '') {
                                                alert('Comment content cannot be empty.');
                                                return;
                                            }
                                            fetch(`/posts/${id}/comments/${commentId}`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ content: newContent })
                                            }).then(res => {
                                                if (res.ok) {
                                                    fetchComments();
                                                } else {
                                                    alert('Failed to update comment.');
                                                }
                                            }).catch(() => {
                                                alert('Network error while updating comment.');
                                            });
                                        });

                                        cancelBtn.addEventListener('click', () => {
                                            commentDiv.replaceChild(commentContent, textarea);
                                            commentDiv.replaceChild(commentEditBtn, saveBtn);
                                            commentDiv.replaceChild(commentDeleteBtn, cancelBtn);
                                        });
                                    });

                                    commentDeleteBtn.addEventListener('click', () => {
                                        if (confirm('Are you sure you want to delete this comment?')) {
                                            fetch(`/posts/${id}/comments/${commentId}`, {
                                                method: 'DELETE'
                                            }).then(res => {
                                                if (res.ok) {
                                                    fetchComments();
                                                } else {
                                                    alert('Failed to delete comment.');
                                                }
                                            }).catch(() => {
                                                alert('Network error while deleting comment.');
                                            });
                                        }
                                    });
                                });
                            })
                            .catch(() => {
                                alert('Failed to load comments.');
                            });
                    }

                    // Handling comment submission
                    addCommentForm.addEventListener('submit', event => {
                        event.preventDefault();
                        const commentContentValue = commentInput.value.trim();
                        if (commentContentValue === '') {
                            alert('Comment cannot be empty.');
                            return;
                        }
                        fetch(`/posts/${id}/comments`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                user: currentUser,
                                userPicture: currentUserPicture,
                                content: commentContentValue
                            })
                        }).then(res => {
                            if (res.ok) {
                                fetchComments();
                                commentInput.value = ''; // Clear the input field
                            } else {
                                alert('Failed to post comment.');
                            }
                        }).catch(() => {
                            alert('Network error while posting comment.');
                        });
                    });

                    // Fetch reactions for the post
                    function fetchReactions() {
                        fetch(`/posts/${encodeURIComponent(id)}/reactions`)
                            .then(response => {
                                if (!response.ok) throw new Error('Network response was not ok');
                                return response.json();
                            })
                            .then(reactionsData => {
                                // reactionsData is an object mapping user to reaction type
                                const reactionCounts = {};
                                let userReaction = null;
                                Object.values(reactions).forEach(r => reactionCounts[r] = 0);
                                Object.entries(reactionsData).forEach(([user, reaction]) => {
                                    reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
                                    if (user === currentUser) {
                                        userReaction = reaction;
                                    }
                                });

                                // Update reaction buttons UI
                                reactions.forEach(reaction => {
                                    const btn = reactionButtons[reaction];
                                    btn.textContent = reaction.charAt(0).toUpperCase() + (reactionCounts[reaction] > 0 ? ` (${reactionCounts[reaction]})` : '');
                                    if (reaction === userReaction) {
                                        btn.classList.add('reacted');
                                    } else {
                                        btn.classList.remove('reacted');
                                    }
                                });

                                // Update reaction count display
                                const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
                                reactionCountDisplay.textContent = totalReactions > 0 ? `${totalReactions} Reactions` : '';
                            })
                            .catch(() => {
                                console.error('Failed to load reactions.');
                            });
                    }

                    // Handle reaction button clicks
                    Object.entries(reactionButtons).forEach(([reaction, btn]) => {
                        btn.addEventListener('click', () => {
                            // Determine if user already reacted with this reaction
                            const isReacted = btn.classList.contains('reacted');
                            if (isReacted) {
                                // Remove reaction
                                fetch(`/posts/${id}/reactions`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ user: currentUser })
                                }).then(res => {
                                    if (res.ok) {
                                        fetchReactions();
                                    } else {
                                        alert('Failed to remove reaction.');
                                    }
                                }).catch(() => {
                                    alert('Network error while removing reaction.');
                                });
                            } else {
                                // Add or update reaction
                            fetch(`/posts/${encodeURIComponent(id)}/reactions`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ user: currentUser, reaction })
                            }).then(res => {
                                if (res.ok) {
                                    fetchReactions();
                                } else {
                                    alert('Failed to add reaction.');
                                }
                            }).catch(() => {
                                alert('Network error while adding reaction.');
                            });
                            }
                        });
                    });

                    fetchReactions();

                    fetchComments();
                });
            })
            .catch(() => {
                alert('Failed to load posts.');
            });
    }

    // Handle post creation
    postForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const postContentValue = postContent.value.trim();
        if (postContentValue === '') {
            alert('Post content cannot be empty.');
            return;
        }
        fetch('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: currentUser,
                userPicture: currentUserPicture,
                content: postContentValue
            })
        }).then(res => {
            if (res.ok) {
                fetchPosts();
                postContent.value = ''; // Clear the input field
            } else {
                alert('Failed to create post.');
            }
        }).catch(() => {
            alert('Network error while creating post.');
        });
    });

    fetchPosts(); // Load initial posts
});
