// ===========================
// 전역 변수
// ===========================
let allMovies = [];


// ===========================
// 유틸리티 함수
// ===========================

// 줄거리를 문장 단위로 3줄 이내로 자르기
function truncateOverview(text, maxLines = 3) {
    if (!text) return '줄거리 정보가 없습니다.';
    
    // 문장 단위로 분리 (마침표, 느낌표, 물음표 기준)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let result = '';
    let lineCount = 0;
    
    for (let sentence of sentences) {
        const testText = result + sentence;
        // 임시로 줄 수 계산 (대략적으로 45자당 1줄로 가정)
        const estimatedLines = Math.ceil(testText.length / 45);
        
        if (estimatedLines <= maxLines) {
            result = testText;
        } else {
            break;
        }
    }
    
    // 결과가 없으면 첫 문장만
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
    
    // 로딩 표시
    searchResults.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading"></div></div>';
    
    searchTimeout = setTimeout(async () => {
        try {
            console.log('검색 시작:', query);
            const movies = await window.searchMovies(query);
            console.log('검색 결과:', movies);
            displaySearchResults(movies);
        } catch (error) {
            console.error('검색 오류:', error);
            searchResults.innerHTML = '<p style="color: #ff5555; padding: 20px; text-align: center;">검색 중 오류가 발생했습니다.</p>';
        }
    }, 500);
});

// 검색 결과 표시
function displaySearchResults(movies) {
    console.log('displaySearchResults 호출:', movies);
    
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
                <img src="${posterUrl}" 
                     alt="${movie.title}" 
                     class="search-result-poster"
                     onerror="this.src='https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image'">
                <div class="search-result-info">
                    <div class="search-result-title">${movie.title}</div>
                    <div class="search-result-meta">${year}</div>
                    <div class="search-result-overview">${overview}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // 검색 결과 클릭 이벤트
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            const movieId = this.dataset.movieId;
            addMovieToCollection(movieId);
        });
    });
}



// ===========================
// Firestore 영화 추가 (스트리밍 링크 입력 추가)
// ===========================

async function addMovieToCollection(movieId) {
    try {
        // 로딩 표시
        searchResults.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div></div>';
        
        // TMDB에서 영화 상세 정보 + 스틸컷 가져오기
        const movieDetails = await window.getMovieDetails(movieId);
        const trailerUrl = await window.getMovieTrailer(movieId);
        const backdrops = await window.getMovieBackdrops(movieId); // 👈 추가!
        
        // 랜덤 백드롭 선택 (있으면)
        let randomBackdrop = '';
        if (backdrops && backdrops.length > 0) {
            const randomIndex = Math.floor(Math.random() * backdrops.length);
            randomBackdrop = backdrops[randomIndex].file_path;
        }
        
        // 스트리밍 링크 입력 받기
        const streamingUrl = prompt(
            `"${movieDetails.title}" 스트리밍 링크를 입력하세요 (나중에 추가 가능):\n\n예시: https://example.com/movie.mp4`,
            ''
        );
        
        // Firestore에 저장할 영화 객체
        const movieData = {
            tmdbId: movieDetails.id,
            title: movieDetails.title,
            year: movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A',
            posterPath: movieDetails.poster_path,
            backdropPath: randomBackdrop || movieDetails.backdrop_path, // 👈 랜덤 백드롭 우선!
            overview: movieDetails.overview,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres ? movieDetails.genres.map(g => g.name).join(', ') : '',
            cast: movieDetails.cast ? movieDetails.cast.slice(0, 5).map(c => c.name).join(', ') : '',
            trailerUrl: trailerUrl || '',
            externalVideoUrl: streamingUrl || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Firestore에 추가
        await db.collection('movies').add(movieData);
        
        console.log('영화 추가 완료:', movieData.title);
        
        // 모달 닫기
        closeModal(searchModal);
        
        // 영화 목록 새로고침
        loadMovies();
        
        // 성공 알림
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

async function displayHeroSlide() {
    const heroSection = document.getElementById('hero-section');
    
    if (!allMovies || allMovies.length === 0) {
        heroSection.style.display = 'none';
        return;
    }
    
    heroSection.style.display = 'flex';
     // 👇 랜덤 영화 선택!
    const randomIndex = Math.floor(Math.random() * allMovies.length);
    const featuredMovie = allMovies[randomIndex];
    
    // 실시간 랜덤 백드롭
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
    
    const heroBackdrop = document.getElementById('hero-backdrop');
    heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;
    
    document.getElementById('hero-poster').src = window.getPosterUrl(featuredMovie.posterPath);

    
    // 제목
    document.getElementById('hero-title').textContent = featuredMovie.title;

    
    // 모바일 전용 레이아웃 체크
const isMobile = window.innerWidth <= 480;

if (isMobile) {
    // ===== 아이폰 전용 레이아웃 =====
    
    // 감독 정보 가져오기
    const movieDetails = await window.getMovieDetails(featuredMovie.tmdbId);
    const directorName = movieDetails.director ? movieDetails.director.name : '정보 없음';
    
    // 메타 라인 재구성
    const heroMeta = document.querySelector('.hero-meta');
    heroMeta.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
            <span class="rating-icon" id="hero-rating-mobile" style="font-size: 0.85em;">${featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒'}</span>
            <span style="color: var(--text-secondary); font-size: 0.8rem;">${featuredMovie.year || 'N/A'}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">·</span>
            <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">DIRECTED BY</span>
        </div>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">${directorName}</div>
    `;
    
     const heroActions = document.querySelector('.hero-actions'); /* 👈 추가! */
    heroActions.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Watch Now</button>
            <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
        </div>
    `;

    
    // 모바일 버튼 이벤트
    setupMobileHeroButtons(featuredMovie);
    
} else {
    // ===== PC/태블릿 기존 레이아웃 =====
    
    // 등급 아이콘 설정
    const ratingIcon = document.getElementById('hero-rating');
    if (featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() !== '') {
        ratingIcon.textContent = '🔓';
    } else {
        ratingIcon.textContent = '🔒';
    }
    
    // 메타 정보
    document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
    document.getElementById('hero-runtime').textContent = featuredMovie.runtime 
        ? `${featuredMovie.runtime}분` 
        : 'N/A';
    document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
    
    // 줄거리
    document.getElementById('hero-overview').textContent = truncateOverview(featuredMovie.overview);
    
    // 감독/출연진 표시
    displayHeroCredits(featuredMovie);
    
    // 버튼 이벤트
    setupHeroButtons(featuredMovie);
}
}




// ===========================
// 히어로 감독/출연진 표시
// ===========================

async function displayHeroCredits(movie) {
    try {
        // TMDB에서 최신 크레딧 정보 가져오기
        const movieDetails = await window.getMovieDetails(movie.tmdbId);
        
        // 감독 표시
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
        
        // 출연진 표시 (상위 5명)
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
        document.getElementById('hero-director').innerHTML = '';
        document.getElementById('hero-cast').innerHTML = '';
    }
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
    
    // Play 버튼 (Referrer 제거)
const playBtn = document.getElementById('hero-play-btn');
playBtn.onclick = () => {
    if (movie.externalVideoUrl) {
        const link = document.createElement('a');
        link.href = movie.externalVideoUrl;
        link.target = '_blank';
        link.rel = 'noreferrer noopener'; // 👈 핵심!
        link.click();
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
    
    // 등급 아이콘 클릭 → URL 입력
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
            
            // URL 있으면 잠금 해제 아이콘으로 변경
            if (newUrl.trim()) {
                ratingIcon.textContent = '🔓';
            } else {
                ratingIcon.textContent = '🔒';
            }
            
            alert('URL이 저장되었습니다!');
            
        } catch (error) {
            console.error('URL 저장 오류:', error);
            alert('URL 저장 중 오류가 발생했습니다.');
        }
    };
    
    // URL 상태에 따라 아이콘 설정
    if (movie.externalVideoUrl && movie.externalVideoUrl.trim() !== '') {
        ratingIcon.textContent = '🔓';
    } else {
        ratingIcon.textContent = '🔒';
    }
}


// ===========================
// 히어로 버튼 이벤트 설정 (모바일 전용)
// ===========================

function setupMobileHeroButtons(movie) {
    // Trailer 버튼
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
    
    // Watch Now 버튼
    const playBtn = document.getElementById('hero-play-btn-mobile');
    if (playBtn) {
        playBtn.onclick = () => {
            if (movie.externalVideoUrl) {
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
    
    // NPlayer 버튼
    const nplayerBtn = document.getElementById('hero-nplayer-btn-mobile');
    if (nplayerBtn) {
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
    
    // 등급 아이콘 클릭
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
                alert('URL이 저장되었습니다!');
                
            } catch (error) {
                console.error('URL 저장 오류:', error);
                alert('URL 저장 중 오류가 발생했습니다.');
            }
        };
    }
}




// ===========================
// 영화 그리드 표시 (영화 카드 클릭 → 히어로 변경 추가)
// ===========================

function displayMovies() {
    if (!allMovies || allMovies.length === 0) {
        moviesGrid.innerHTML = '<p style="color: var(--text-secondary); padding: 40px; text-align: center; grid-column: 1 / -1;">아직 추가된 영화가 없습니다.<br>상단의 "+ 영화 추가" 버튼을 눌러 영화를 추가해보세요!</p>';
        return;
    }
    
    moviesGrid.innerHTML = allMovies.map((movie, index) => `
    <div class="movie-card" data-movie-id="${movie.id}" data-movie-index="${index}">
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
        <div class="movie-card-info">
            <div class="movie-card-info-title">${movie.title}</div>
            <div class="movie-card-info-year">${movie.year || 'N/A'}</div>
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
    
    // Play 버튼 (Referrer 제거)
document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const url = this.dataset.url;
        if (url && url.trim() !== '') {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noreferrer noopener'; // 👈 핵심!
            link.click();
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
            if (url && url.trim() !== '') {
                const nplayerUrl = `nplayer-${url}`;
                const link = document.createElement('a');
                link.href = nplayerUrl;
                link.click();
            } else {
                alert('재생 URL이 설정되지 않았습니다.\n영화를 삭제 후 다시 추가하여 URL을 입력하세요.');
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
    
    // 영화 카드 클릭 (모바일: 2단계, PC: 바로 히어로)
document.querySelectorAll('.movie-card').forEach(card => {
    let clickCount = 0;
    let clickTimer = null;
    
    card.addEventListener('click', function(e) {
        // 버튼 클릭은 제외
        if (e.target.classList.contains('btn-small')) return;
        
        const movieIndex = parseInt(this.dataset.movieIndex);
        const isMobile = window.innerWidth <= 480;
        
        if (isMobile) {
            // 모바일: 2단계 클릭
            clickCount++;
            
            if (clickCount === 1) {
                // 첫 번째 클릭: 정보 슬라이드 업
                this.classList.add('active');
                
                // 3초 후 리셋
                clearTimeout(clickTimer);
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                    this.classList.remove('active');
                }, 3000);
            } else {
                // 두 번째 클릭: 히어로 이동
                clearTimeout(clickTimer);
                clickCount = 0;
                this.classList.remove('active');
                
                changeHeroMovie(movieIndex);
                window.scrollTo({ top: 0, behavior: 'smooth' }); // 👈 최상단 스크롤
            }
        } else {
            // PC/태블릿: 바로 히어로 이동
            changeHeroMovie(movieIndex);
            document.getElementById('hero-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
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


// ===========================
// 히어로 영화 변경 (영화 카드 클릭 시)
// ===========================

async function changeHeroMovie(index) {
    if (!allMovies || !allMovies[index]) return;
    
    const featuredMovie = allMovies[index];
    
    // 실시간 랜덤 백드롭
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
    
    const heroBackdrop = document.getElementById('hero-backdrop');
    heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;

    
    // 포스터
    document.getElementById('hero-poster').src = window.getPosterUrl(featuredMovie.posterPath);
    
    // 제목
document.getElementById('hero-title').textContent = featuredMovie.title;

// 등급 아이콘 설정 (URL 여부에 따라) 👈 추가!
const ratingIcon = document.getElementById('hero-rating');
if (featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() !== '') {
    ratingIcon.textContent = '🔓';
} else {
    ratingIcon.textContent = '🔒';
}

// 모바일 전용 레이아웃 체크
const isMobile = window.innerWidth <= 480;

if (isMobile) {
    // ===== 아이폰 전용 레이아웃 =====
    
    // 감독 정보 가져오기
    const movieDetails = await window.getMovieDetails(featuredMovie.tmdbId);
    const directorName = movieDetails.director ? movieDetails.director.name : '정보 없음';
    
    // 메타 라인 재구성: 등급 · 연도 · DIRECTED BY (한 줄) + 감독 이름 (다음 줄)
    const heroMeta = document.querySelector('.hero-meta');
       heroMeta.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
            <span class="rating-icon" id="hero-rating-mobile" style="font-size: 0.85em;">${featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒'}</span>
            <span style="color: var(--text-secondary); font-size: 0.8rem;">${featuredMovie.year || 'N/A'}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">·</span>
            <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">DIRECTED BY</span>
        </div>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">${directorName}</div>
    `;
    
        const heroActions = document.querySelector('.hero-actions');
    heroActions.innerHTML = `  /* 👈 백틱 추가! */
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Watch Now</button>
            <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
        </div>
    `;


    
    // 모바일 버튼 이벤트
    setupMobileHeroButtons(featuredMovie);
    
} else {
    // ===== PC/태블릿 기존 레이아웃 =====
    
    // 메타 정보
    document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
    document.getElementById('hero-runtime').textContent = featuredMovie.runtime 
        ? `${featuredMovie.runtime}분` 
        : 'N/A';
    document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
    
    // 줄거리
    document.getElementById('hero-overview').textContent = truncateOverview(featuredMovie.overview);
    
    // 감독/출연진 표시
    displayHeroCredits(featuredMovie);
    
    // 버튼 이벤트
    setupHeroButtons(featuredMovie);
}

}
