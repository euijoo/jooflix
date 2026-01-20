// ===========================
// 전역 변수
// ===========================
let allMovies = [];

// ===========================
// 유틸리티 함수
// ===========================

function truncateOverview(text, maxLines = 3) {
    if (!text) return '줄거리 정보가 없습니다.';
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let result = '';
    
    for (let sentence of sentences) {
        const testText = result + sentence;
        const estimatedLines = Math.ceil(testText.length / 45);
        
        if (estimatedLines <= maxLines) {
            result = testText;
        } else {
            break;
        }
    }
    
    return result.trim() || sentences[0];
}

// DOM 요소
const searchModal = document.getElementById('search-modal');
const videoModal = document.getElementById('video-modal');
const searchBtnNav = document.getElementById('search-btn-nav');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const moviesGrid = document.getElementById('movies-grid');
const videoPlayer = document.getElementById('video-player');

let searchTimeout;

// ===========================
// 초기화
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// ===========================
// 모달 제어
// ===========================

searchBtnNav.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
    });
});

searchModal.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this);
});

videoModal.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this);
});

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (modal === videoModal) {
        videoPlayer.src = '';
    }
    
    if (modal === searchModal) {
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (searchModal.classList.contains('active')) closeModal(searchModal);
        if (videoModal.classList.contains('active')) closeModal(videoModal);
    }
});
// ===========================
// 검색 기능
// ===========================

searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }
    
    searchResults.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading"></div></div>';
    
    searchTimeout = setTimeout(async () => {
        try {
            const movies = await window.searchMovies(query);
            displaySearchResults(movies);
        } catch (error) {
            console.error('검색 오류:', error);
            searchResults.innerHTML = '<p style="color: #ff5555; padding: 20px; text-align: center;">검색 중 오류가 발생했습니다.</p>';
        }
    }, 500);
});

function displaySearchResults(movies) {
    if (!movies || movies.length === 0) {
        searchResults.innerHTML = '<p style="color: var(--text-secondary); padding: 20px; text-align: center;">검색 결과가 없습니다.</p>';
        return;
    }
    
    searchResults.innerHTML = movies.map(movie => {
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const overview = movie.overview || '줄거리 정보가 없습니다.';
        
        return `
            <div class="search-result-item" data-movie-id="${movie.id}">
                <img src="${posterUrl}" alt="${movie.title}" class="search-result-poster"
                     onerror="this.src='https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image'">
                <div class="search-result-info">
                    <div class="search-result-title">${movie.title}</div>
                    <div class="search-result-meta">${year}</div>
                    <div class="search-result-overview">${overview}</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            addMovieToCollection(this.dataset.movieId);
        });
    });
}

// ===========================
// Firestore 영화 추가
// ===========================

async function addMovieToCollection(movieId) {
    try {
        searchResults.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div></div>';
        
        const movieDetails = await window.getMovieDetails(movieId);
        const trailerUrl = await window.getMovieTrailer(movieId);
        const backdrops = await window.getMovieBackdrops(movieId);
        
        let randomBackdrop = '';
        if (backdrops && backdrops.length > 0) {
            const randomIndex = Math.floor(Math.random() * backdrops.length);
            randomBackdrop = backdrops[randomIndex].file_path;
        }
        
        const streamingUrl = prompt(
            `"${movieDetails.title}" 스트리밍 링크를 입력하세요 (나중에 추가 가능):\n\n예시: https://example.com/movie.mp4`,
            ''
        );
        
        const movieData = {
            tmdbId: movieDetails.id,
            title: movieDetails.title,
            year: movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A',
            posterPath: movieDetails.poster_path,
            backdropPath: randomBackdrop || movieDetails.backdrop_path,
            overview: movieDetails.overview,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres ? movieDetails.genres.map(g => g.name).join(', ') : '',
            cast: movieDetails.cast ? movieDetails.cast.slice(0, 5).map(c => c.name).join(', ') : '',
            trailerUrl: trailerUrl || '',
            externalVideoUrl: streamingUrl || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('movies').add(movieData);
        console.log('영화 추가 완료:', movieData.title);
        
        closeModal(searchModal);
        loadMovies();
        alert(`"${movieData.title}"이(가) 컬렉션에 추가되었습니다!`);
        
    } catch (error) {
        console.error('영화 추가 오류:', error);
        alert('영화를 추가하는 중 오류가 발생했습니다.');
    }
}

// ===========================
// Firestore 로드
// ===========================

async function loadMovies() {
    try {
        const snapshot = await db.collection('movies').orderBy('createdAt', 'desc').get();
        
        allMovies = [];
        snapshot.forEach(doc => {
            allMovies.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`${allMovies.length}개 영화 로드 완료`);
        displayHeroSlide();
        displayMovies();
        
    } catch (error) {
        console.error('영화 로드 오류:', error);
    }
}
// ===========================
// 히어로 섹션 표시
// ===========================

async function displayHeroSlide() {
    const heroSection = document.getElementById('hero-section');
    
    if (!allMovies || allMovies.length === 0) {
        heroSection.style.display = 'none';
        return;
    }
    
    heroSection.style.display = 'flex';
    const randomIndex = Math.floor(Math.random() * allMovies.length);
    const featuredMovie = allMovies[randomIndex];
    
    // 랜덤 백드롭
    const backdrops = await window.getMovieBackdrops(featuredMovie.tmdbId);
    let backdropUrl;
    
    if (backdrops && backdrops.length > 0) {
        const randomIndex = Math.floor(Math.random() * backdrops.length);
        backdropUrl = `https://image.tmdb.org/t/p/original${backdrops[randomIndex].file_path}`;
    } else {
        backdropUrl = featuredMovie.backdropPath 
            ? `https://image.tmdb.org/t/p/original${featuredMovie.backdropPath}`
            : window.getPosterUrl(featuredMovie.posterPath);
    }
    
    document.getElementById('hero-backdrop').style.backgroundImage = `url(${backdropUrl})`;
    document.getElementById('hero-poster').src = window.getPosterUrl(featuredMovie.posterPath);
    document.getElementById('hero-title').textContent = featuredMovie.title;
    
    // 모바일/PC 분기
    const isMobile = window.innerWidth <= 480;
    
    if (isMobile) {
        // 아이폰 레이아웃
        const movieDetails = await window.getMovieDetails(featuredMovie.tmdbId);
        const directorName = movieDetails.director ? movieDetails.director.name : '정보 없음';
        
        document.querySelector('.hero-meta').innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                <span class="rating-icon" id="hero-rating-mobile" style="font-size: 0.85em;">${featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒'}</span>
                <span style="color: var(--text-secondary); font-size: 0.8rem;">${featuredMovie.year || 'N/A'}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">·</span>
                <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">DIRECTED BY</span>
            </div>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">${directorName}</div>
        `;
        
        document.querySelector('.hero-actions').innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
                <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Watch Now</button>
                <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
            </div>
        `;
        
        setupMobileHeroButtons(featuredMovie);
        
    } else {
        // PC/태블릿 레이아웃
        const ratingIcon = document.getElementById('hero-rating');
        ratingIcon.textContent = featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒';
        
        document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
        document.getElementById('hero-runtime').textContent = featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A';
        document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
        document.getElementById('hero-overview').textContent = truncateOverview(featuredMovie.overview);
        
        displayHeroCredits(featuredMovie);
        setupHeroButtons(featuredMovie);
    }
}

// ===========================
// 히어로 감독/출연진 표시
// ===========================

async function displayHeroCredits(movie) {
    try {
        const movieDetails = await window.getMovieDetails(movie.tmdbId);
        
        const directorContainer = document.getElementById('hero-director');
        if (movieDetails.director) {
            const directorPhoto = movieDetails.director.profile_path
                ? `https://image.tmdb.org/t/p/w185${movieDetails.director.profile_path}`
                : 'https://via.placeholder.com/60x60/2C3440/99AABB?text=?';
            
            directorContainer.innerHTML = `
                <div class="credit-item">
                    <img src="${directorPhoto}" alt="${movieDetails.director.name}" class="credit-photo">
                    <div class="credit-name">${movieDetails.director.name}</div>
                </div>
            `;
        } else {
            directorContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">정보 없음</div>';
        }
        
        const castContainer = document.getElementById('hero-cast');
        if (movieDetails.cast && movieDetails.cast.length > 0) {
            castContainer.innerHTML = movieDetails.cast.slice(0, 5).map(actor => {
                const actorPhoto = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : 'https://via.placeholder.com/60x60/2C3440/99AABB?text=?';
                
                return `
                    <div class="credit-item">
                        <img src="${actorPhoto}" alt="${actor.name}" class="credit-photo">
                        <div class="credit-name">${actor.name}</div>
                    </div>
                `;
            }).join('');
        } else {
            castContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">정보 없음</div>';
        }
    } catch (error) {
        console.error('크레딧 표시 오류:', error);
    }
}
// ===========================
// 히어로 버튼 이벤트 (PC/태블릿)
// ===========================

function setupHeroButtons(movie) {
    const trailerBtn = document.getElementById('hero-trailer-btn');
    trailerBtn.onclick = () => {
        if (movie.trailerUrl) {
            playTrailer(movie.trailerUrl);
        } else {
            alert('예고편이 없습니다.');
        }
    };
    
    const playBtn = document.getElementById('hero-play-btn');
    playBtn.onclick = () => {
        if (movie.externalVideoUrl && movie.externalVideoUrl.trim()) {
            const link = document.createElement('a');
            link.href = movie.externalVideoUrl;
            link.target = '_blank';
            link.rel = 'noreferrer noopener';
            link.click();
        } else {
            alert('재생 URL이 설정되지 않았습니다.');
        }
    };
    
    const nplayerBtn = document.getElementById('hero-nplayer-btn');
    nplayerBtn.onclick = () => {
        if (movie.externalVideoUrl && movie.externalVideoUrl.trim()) {
            const link = document.createElement('a');
            link.href = `nplayer-${movie.externalVideoUrl}`;
            link.click();
        } else {
            alert('재생 URL이 설정되지 않았습니다.');
        }
    };
    
    const ratingIcon = document.getElementById('hero-rating');
    ratingIcon.onclick = async () => {
        const currentUrl = movie.externalVideoUrl || '';
        const newUrl = prompt(
            `"${movie.title}" 재생 URL 입력:\n\n현재: ${currentUrl || '(없음)'}`,
            currentUrl
        );
        
        if (newUrl === null) return;
        
        try {
            await db.collection('movies').doc(movie.id).update({
                externalVideoUrl: newUrl.trim()
            });
            
            movie.externalVideoUrl = newUrl.trim();
            ratingIcon.textContent = newUrl.trim() ? '🔓' : '🔒';
            
            const movieInList = allMovies.find(m => m.id === movie.id);
            if (movieInList) movieInList.externalVideoUrl = newUrl.trim();
            
            alert('URL이 저장되었습니다!');
        } catch (error) {
            console.error('URL 저장 오류:', error);
            alert('URL 저장 중 오류가 발생했습니다.');
        }
    };
}

// ===========================
// 히어로 버튼 이벤트 (모바일)
// ===========================

function setupMobileHeroButtons(movie) {
    const trailerBtn = document.getElementById('hero-trailer-btn-mobile');
    if (trailerBtn) {
        trailerBtn.onclick = () => {
            if (movie.trailerUrl) {
                playTrailer(movie.trailerUrl);
            } else {
                alert('예고편이 없습니다.');
            }
        };
    }
    
    const playBtn = document.getElementById('hero-play-btn-mobile');
    if (playBtn) {
        playBtn.onclick = () => {
            if (movie.externalVideoUrl && movie.externalVideoUrl.trim()) {
                const link = document.createElement('a');
                link.href = movie.externalVideoUrl;
                link.target = '_blank';
                link.rel = 'noreferrer noopener';
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        };
    }
    
    const nplayerBtn = document.getElementById('hero-nplayer-btn-mobile');
    if (nplayerBtn) {
        nplayerBtn.onclick = () => {
            if (movie.externalVideoUrl && movie.externalVideoUrl.trim()) {
                const link = document.createElement('a');
                link.href = `nplayer-${movie.externalVideoUrl}`;
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        };
    }
    
    const ratingIcon = document.getElementById('hero-rating-mobile');
    if (ratingIcon) {
        ratingIcon.onclick = async () => {
            const currentUrl = movie.externalVideoUrl || '';
            const newUrl = prompt(
                `"${movie.title}" 재생 URL 입력:\n\n현재: ${currentUrl || '(없음)'}`,
                currentUrl
            );
            
            if (newUrl === null) return;
            
            try {
                await db.collection('movies').doc(movie.id).update({
                    externalVideoUrl: newUrl.trim()
                });
                
                movie.externalVideoUrl = newUrl.trim();
                ratingIcon.textContent = newUrl.trim() ? '🔓' : '🔒';
                
                const movieInList = allMovies.find(m => m.id === movie.id);
                if (movieInList) movieInList.externalVideoUrl = newUrl.trim();
                
                alert('URL이 저장되었습니다!');
            } catch (error) {
                console.error('URL 저장 오류:', error);
                alert('URL 저장 중 오류가 발생했습니다.');
            }
        };
    }
}

// ===========================
// 예고편 재생
// ===========================

function playTrailer(trailerUrl) {
    if (!trailerUrl) {
        alert('예고편이 없습니다.');
        return;
    }
    
    let embedUrl = trailerUrl;
    if (trailerUrl.includes('youtube.com/watch')) {
        const videoId = trailerUrl.split('v=')[1];
        const ampersandPosition = videoId.indexOf('&');
        const cleanVideoId = ampersandPosition !== -1 ? videoId.substring(0, ampersandPosition) : videoId;
        embedUrl = `https://www.youtube.com/embed/${cleanVideoId}?autoplay=1`;
    } else if (trailerUrl.includes('youtu.be/')) {
        const videoId = trailerUrl.split('youtu.be/')[1];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    videoPlayer.src = embedUrl;
    openModal(videoModal);
}
// ===========================
// 영화 그리드 표시
// ===========================

function displayMovies() {
    if (!allMovies || allMovies.length === 0) {
        moviesGrid.innerHTML = '<p style="color: var(--text-secondary); padding: 40px; text-align: center; grid-column: 1 / -1;">아직 추가된 영화가 없습니다.<br>상단의 "+ 영화 추가" 버튼을 눌러 영화를 추가해보세요!</p>';
        return;
    }
    
    moviesGrid.innerHTML = allMovies.map((movie, index) => `
        <div class="movie-card" data-movie-id="${movie.id}" data-movie-index="${index}">
            <img src="${window.getPosterUrl(movie.posterPath)}" alt="${movie.title}"
                 onerror="this.src='https://via.placeholder.com/300x450/2C3440/99AABB?text=No+Image'">
            <div class="movie-card-overlay">
                <div class="movie-card-title">${movie.title}</div>
                <div class="movie-card-year">${movie.year || 'N/A'}</div>
                <div class="movie-card-actions">
                    <button class="btn-small btn-trailer" data-trailer="${movie.trailerUrl || ''}">예고편</button>
                    <button class="btn-small btn-play" data-url="${movie.externalVideoUrl || ''}">Play</button>
                    <button class="btn-small btn-nplayer" data-url="${movie.externalVideoUrl || ''}">NPlayer</button>
                    <button class="btn-small btn-delete" data-movie-id="${movie.id}">삭제</button>
                </div>
            </div>
            <div class="movie-card-info">
                <div class="movie-card-info-title">${movie.title}</div>
                <div class="movie-card-info-year">${movie.year || 'N/A'}</div>
            </div>
        </div>
    `).join('');
    
    attachMovieCardEvents();
}

// ===========================
// 영화 카드 이벤트
// ===========================

function attachMovieCardEvents() {
    document.querySelectorAll('.btn-trailer').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (this.dataset.trailer) {
                playTrailer(this.dataset.trailer);
            } else {
                alert('예고편이 없습니다.');
            }
        });
    });
    
    document.querySelectorAll('.btn-play').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.dataset.url;
            if (url && url.trim()) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noreferrer noopener';
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        });
    });
    
    document.querySelectorAll('.btn-nplayer').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.dataset.url;
            if (url && url.trim()) {
                const link = document.createElement('a');
                link.href = `nplayer-${url}`;
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteMovie(this.dataset.movieId);
        });
    });
    
    document.querySelectorAll('.movie-card').forEach(card => {
        let clickCount = 0;
        let clickTimer = null;
        
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-small')) return;
            
            const movieIndex = parseInt(this.dataset.movieIndex);
            const isMobile = window.innerWidth <= 480;
            
            if (isMobile) {
                clickCount++;
                
                if (clickCount === 1) {
                    this.classList.add('active');
                    clearTimeout(clickTimer);
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                        this.classList.remove('active');
                    }, 3000);
                } else {
                    clearTimeout(clickTimer);
                    clickCount = 0;
                    this.classList.remove('active');
                    changeHeroMovie(movieIndex);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                changeHeroMovie(movieIndex);
                document.getElementById('hero-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ===========================
// 영화 삭제
// ===========================

async function deleteMovie(movieId) {
    const movie = allMovies.find(m => m.id === movieId);
    if (!movie) return;
    
    if (!confirm(`"${movie.title}"을(를) 삭제하시겠습니까?`)) return;
    
    try {
        await db.collection('movies').doc(movieId).delete();
        console.log('영화 삭제 완료:', movie.title);
        
        allMovies = allMovies.filter(m => m.id !== movieId);
        displayHeroSlide();
        displayMovies();
    } catch (error) {
        console.error('영화 삭제 오류:', error);
        alert('영화를 삭제하는 중 오류가 발생했습니다.');
    }
}

// ===========================
// 히어로 영화 변경
// ===========================

async function changeHeroMovie(index) {
    if (!allMovies || !allMovies[index]) return;
    
    const featuredMovie = allMovies[index];
    
    const backdrops = await window.getMovieBackdrops(featuredMovie.tmdbId);
    let backdropUrl;
    
    if (backdrops && backdrops.length > 0) {
        const randomIndex = Math.floor(Math.random() * backdrops.length);
        backdropUrl = `https://image.tmdb.org/t/p/original${backdrops[randomIndex].file_path}`;
    } else {
        backdropUrl = featuredMovie.backdropPath 
            ? `https://image.tmdb.org/t/p/original${featuredMovie.backdropPath}`
            : window.getPosterUrl(featuredMovie.posterPath);
    }
    
    document.getElementById('hero-backdrop').style.backgroundImage = `url(${backdropUrl})`;
    document.getElementById('hero-poster').src = window.getPosterUrl(featuredMovie.posterPath);
    document.getElementById('hero-title').textContent = featuredMovie.title;
    
    const isMobile = window.innerWidth <= 480;
    
    if (isMobile) {
        const movieDetails = await window.getMovieDetails(featuredMovie.tmdbId);
        const directorName = movieDetails.director ? movieDetails.director.name : '정보 없음';
        
        document.querySelector('.hero-meta').innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                <span class="rating-icon" id="hero-rating-mobile" style="font-size: 0.85em;">${featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒'}</span>
                <span style="color: var(--text-secondary); font-size: 0.8rem;">${featuredMovie.year || 'N/A'}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">·</span>
                <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">DIRECTED BY</span>
            </div>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">${directorName}</div>
        `;
        
        document.querySelector('.hero-actions').innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
                <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Watch Now</button>
                <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
            </div>
        `;
        
        setupMobileHeroButtons(featuredMovie);
        
    } else {
        const ratingIcon = document.getElementById('hero-rating');
        ratingIcon.textContent = featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒';
        
        document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
        document.getElementById('hero-runtime').textContent = featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A';
        document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
        document.getElementById('hero-overview').textContent = truncateOverview(featuredMovie.overview);
        
        displayHeroCredits(featuredMovie);
        setupHeroButtons(featuredMovie);
    }
}
