// ===========================
// 전역 변수
// ===========================
let allMovies = [];

// DOM 요소
const searchModal = document.getElementById('search-modal');
const videoModal = document.getElementById('video-modal');
const searchBtnNav = document.getElementById('search-btn-nav');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const moviesGrid = document.getElementById('movies-grid');
const videoPlayer = document.getElementById('video-player');

// 디바운스 타이머
let searchTimeout;

// ===========================
// 초기화
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
    
    // 네비게이션 링크 활성화
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

// 검색 모달 열기
searchBtnNav.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

// 모달 닫기 (X 버튼)
document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
    });
});

// 모달 배경 클릭 시 닫기
searchModal.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal(this);
    }
});

videoModal.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal(this);
    }
});

// 모달 열기 함수
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기 함수
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // 비디오 모달이면 재생 중지
    if (modal === videoModal) {
        videoPlayer.src = '';
    }
    
    // 검색 모달이면 검색 결과 초기화
    if (modal === searchModal) {
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (searchModal.classList.contains('active')) {
            closeModal(searchModal);
        }
        if (videoModal.classList.contains('active')) {
            closeModal(videoModal);
        }
    }
});
// ===========================
// 검색 기능
// ===========================

// 검색 입력 이벤트 (디바운싱)
searchInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }
    
    searchTimeout = setTimeout(() => {
        searchMovies(query);
    }, 500);
});

// TMDB 영화 검색
async function searchMovies(query) {
    try {
        const movies = await window.searchMovies(query);
        displaySearchResults(movies);
    } catch (error) {
        console.error('검색 오류:', error);
        searchResults.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">검색 중 오류가 발생했습니다.</p>';
    }
}

// 검색 결과 표시
function displaySearchResults(movies) {
    if (!movies || movies.length === 0) {
        searchResults.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">검색 결과가 없습니다.</p>';
        return;
    }
    
    searchResults.innerHTML = movies.map(movie => `
        <div class="search-result-item" data-movie-id="${movie.id}">
            <img src="${window.getPosterUrl(movie.poster_path)}" 
                 alt="${movie.title}" 
                 class="search-result-poster"
                 onerror="this.src='https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image'">
            <div class="search-result-info">
                <div class="search-result-title">${movie.title}</div>
                <div class="search-result-meta">
                    ${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                </div>
                <div class="search-result-overview">
                    ${movie.overview || '줄거리 정보가 없습니다.'}
                </div>
            </div>
        </div>
    `).join('');
    
    // 검색 결과 클릭 이벤트
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            const movieId = this.dataset.movieId;
            addMovieToCollection(movieId);
        });
    });
}

// ===========================
// Firestore 영화 추가
// ===========================

async function addMovieToCollection(movieId) {
    try {
        // 로딩 표시
        searchResults.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div></div>';
        
        // TMDB에서 영화 상세 정보 가져오기
        const movieDetails = await window.getMovieDetails(movieId);
        const trailerUrl = await window.getMovieTrailer(movieId);
        
        // Firestore에 저장할 영화 객체
        const movieData = {
            tmdbId: movieDetails.id,
            title: movieDetails.title,
            year: movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A',
            posterPath: movieDetails.poster_path,
            backdropPath: movieDetails.backdrop_path,
            overview: movieDetails.overview,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres ? movieDetails.genres.map(g => g.name).join(', ') : '',
            cast: movieDetails.cast ? movieDetails.cast.slice(0, 5).map(c => c.name).join(', ') : '',
            trailerUrl: trailerUrl || '',
            externalVideoUrl: '', // 사용자가 나중에 추가
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Firestore에 추가
        await db.collection('movies').add(movieData);
        
        console.log('영화 추가 완료:', movieData.title);
        
        // 모달 닫기
        closeModal(searchModal);
        
        // 영화 목록 새로고침
        loadMovies();
        
        // 성공 알림 (선택사항)
        alert(`"${movieData.title}"이(가) 컬렉션에 추가되었습니다!`);
        
    } catch (error) {
        console.error('영화 추가 오류:', error);
        alert('영화를 추가하는 중 오류가 발생했습니다.');
    }
}
// ===========================
// Firestore에서 영화 목록 불러오기
// ===========================

async function loadMovies() {
    try {
        const snapshot = await db.collection('movies')
            .orderBy('createdAt', 'desc')
            .get();
        
        allMovies = [];
        snapshot.forEach(doc => {
            allMovies.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`${allMovies.length}개 영화 로드 완료`);
        
        // 히어로와 그리드 표시
        displayHeroSlide();
        displayMovies();
        
    } catch (error) {
        console.error('영화 로드 오류:', error);
    }
}

// ===========================
// 히어로 섹션 표시
// ===========================

function displayHeroSlide() {
    const heroSection = document.getElementById('hero-section');
    
    if (!allMovies || allMovies.length === 0) {
        heroSection.style.display = 'none';
        return;
    }
    
    heroSection.style.display = 'flex';
    
    // 첫 번째 영화를 히어로로 표시
    const featuredMovie = allMovies[0];
    
    // 배경 이미지
    const heroBackdrop = document.getElementById('hero-backdrop');
    const backdropUrl = featuredMovie.backdropPath 
        ? `https://image.tmdb.org/t/p/original${featuredMovie.backdropPath}`
        : window.getPosterUrl(featuredMovie.posterPath);
    heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;
    
    // 포스터
    document.getElementById('hero-poster').src = window.getPosterUrl(featuredMovie.posterPath);
    
    // 제목
    document.getElementById('hero-title').textContent = featuredMovie.title;
    
    // 메타 정보
    document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
    document.getElementById('hero-runtime').textContent = featuredMovie.runtime 
        ? `${featuredMovie.runtime}분` 
        : 'N/A';
    document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
    
    // 줄거리
    document.getElementById('hero-overview').textContent = featuredMovie.overview || '줄거리 정보가 없습니다.';
    
    // 버튼 이벤트
    setupHeroButtons(featuredMovie);
}

// ===========================
// 히어로 버튼 이벤트 설정
// ===========================

function setupHeroButtons(movie) {
    // 예고편 보기 버튼
    const trailerBtn = document.getElementById('hero-trailer-btn');
    trailerBtn.onclick = () => {
        if (movie.trailerUrl) {
            playTrailer(movie.trailerUrl);
        } else {
            alert('예고편이 없습니다.');
        }
    };
    
    // Play 버튼
    const playBtn = document.getElementById('hero-play-btn');
    playBtn.onclick = () => {
        if (movie.externalVideoUrl) {
            window.open(movie.externalVideoUrl, '_blank');
        } else {
            alert('재생 URL이 설정되지 않았습니다.');
        }
    };
    
    // NPlayer 버튼
    const nplayerBtn = document.getElementById('hero-nplayer-btn');
    nplayerBtn.onclick = () => {
        if (movie.externalVideoUrl) {
            const nplayerUrl = `nplayer-${movie.externalVideoUrl}`;
            const link = document.createElement('a');
            link.href = nplayerUrl;
            link.click();
        } else {
            alert('재생 URL이 설정되지 않았습니다.');
        }
    };
}
// ===========================
// 영화 그리드 표시
// ===========================

function displayMovies() {
    if (!allMovies || allMovies.length === 0) {
        moviesGrid.innerHTML = '<p style="color: var(--text-secondary); padding: 40px; text-align: center; grid-column: 1 / -1;">아직 추가된 영화가 없습니다.<br>상단의 "+ 영화 추가" 버튼을 눌러 영화를 추가해보세요!</p>';
        return;
    }
    
    moviesGrid.innerHTML = allMovies.map(movie => `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${window.getPosterUrl(movie.posterPath)}" 
                 alt="${movie.title}"
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
        </div>
    `).join('');
    
    // 이벤트 리스너 추가
    attachMovieCardEvents();
}

// ===========================
// 영화 카드 이벤트 연결
// ===========================

function attachMovieCardEvents() {
    // 예고편 버튼
    document.querySelectorAll('.btn-trailer').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const trailerUrl = this.dataset.trailer;
            if (trailerUrl) {
                playTrailer(trailerUrl);
            } else {
                alert('예고편이 없습니다.');
            }
        });
    });
    
    // Play 버튼
    document.querySelectorAll('.btn-play').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.dataset.url;
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        });
    });
    
    // NPlayer 버튼
    document.querySelectorAll('.btn-nplayer').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.dataset.url;
            if (url) {
                const nplayerUrl = `nplayer-${url}`;
                const link = document.createElement('a');
                link.href = nplayerUrl;
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.');
            }
        });
    });
    
    // 삭제 버튼
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const movieId = this.dataset.movieId;
            deleteMovie(movieId);
        });
    });
}

// ===========================
// 예고편 재생
// ===========================

function playTrailer(trailerUrl) {
    if (!trailerUrl) {
        alert('예고편이 없습니다.');
        return;
    }
    
    // YouTube URL을 embed 형식으로 변환
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
// 영화 삭제
// ===========================

async function deleteMovie(movieId) {
    const movie = allMovies.find(m => m.id === movieId);
    if (!movie) return;
    
    const confirmed = confirm(`"${movie.title}"을(를) 삭제하시겠습니까?`);
    if (!confirmed) return;
    
    try {
        await db.collection('movies').doc(movieId).delete();
        console.log('영화 삭제 완료:', movie.title);
        
        // 로컬 배열에서도 제거
        allMovies = allMovies.filter(m => m.id !== movieId);
        
        // 화면 갱신
        displayHeroSlide();
        displayMovies();
        
    } catch (error) {
        console.error('영화 삭제 오류:', error);
        alert('영화를 삭제하는 중 오류가 발생했습니다.');
    }
}
