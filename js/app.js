// ===========================
// 전역 변수
// ===========================
let allMovies = [];
let currentTab = 'all';
let currentEditingMovie = null; // 👈 추가!
// ===========================
// 유틸리티
// ===========================

function truncateOverview(text, maxLines = 3) {
    if (!text) return '줄거리 정보가 없습니다.';
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let result = '';
    
    for (let sentence of sentences) {
        const testText = result + sentence;
        if (Math.ceil(testText.length / 45) <= maxLines) {
            result = testText;
        } else {
            break;
        }
    }
    return result.trim() || sentences[0];
}

// DOM (모두 상단으로!)
const searchModal = document.getElementById('search-modal');
const videoModal = document.getElementById('video-modal');
const episodeModal = document.getElementById('episode-modal'); // 👈 여기로 이동!
const searchBtnNav = document.getElementById('search-btn-nav');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const moviesGrid = document.getElementById('movies-grid');
const videoPlayer = document.getElementById('video-player');
const episodeList = document.getElementById('episode-list'); // 👈 추가
const addEpisodeBtn = document.getElementById('add-episode-btn'); // 👈 추가
const saveEpisodesBtn = document.getElementById('save-episodes-btn'); // 👈 추가

let searchTimeout;


// ===========================
// 초기화
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.id === 'search-btn-nav') return;
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            filterAndDisplayMovies();
        });
    });

        loadMovies(); // 👈 이 줄을 추가하세요!
});

// ===========================
// 모달
// ===========================

searchBtnNav.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
    openModal(searchModal);
    searchInput.focus();
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function() {
        closeModal(this.closest('.modal'));
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
    if (modal === videoModal) videoPlayer.src = '';
    if (modal === searchModal) {
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (searchModal.classList.contains('active')) closeModal(searchModal);
        if (videoModal.classList.contains('active')) closeModal(videoModal);
        if (episodeModal.classList.contains('active')) closeModal(episodeModal); // 👈 추가
    }
});
// ===========================
// 검색
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
            const searchType = document.querySelector('input[name="search-type"]:checked').value;
            const results = searchType === 'movie' 
                ? await window.searchMovies(query) 
                : await window.searchTVShows(query);
            
            displaySearchResults(results, searchType);
        } catch (error) {
            console.error('검색 오류:', error);
            searchResults.innerHTML = '<p style="color: #ff5555; padding: 20px; text-align: center;">검색 중 오류가 발생했습니다.</p>';
        }
    }, 500);
});

function displaySearchResults(items, type) {
    if (!items || items.length === 0) {
        searchResults.innerHTML = '<p style="color: var(--text-secondary); padding: 20px; text-align: center;">검색 결과가 없습니다.</p>';
        return;
    }
    
    searchResults.innerHTML = items.map(item => {
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image';
        const year = type === 'movie' 
            ? (item.release_date ? item.release_date.split('-')[0] : 'N/A')
            : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
        const title = type === 'movie' ? item.title : item.name;
        const overview = item.overview || '줄거리 정보가 없습니다.';
        const typeIcon = type === 'movie' ? '🎬' : '📺';
        
        return `
            <div class="search-result-item" data-item-id="${item.id}" data-item-type="${type}">
                <img src="${posterUrl}" alt="${title}" class="search-result-poster"
                     onerror="this.src='https://via.placeholder.com/60x90/2C3440/99AABB?text=No+Image'">
                <div class="search-result-info">
                    <div class="search-result-title">${typeIcon} ${title}</div>
                    <div class="search-result-meta">${year}</div>
                    <div class="search-result-overview">${overview}</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            addToCollection(this.dataset.itemId, this.dataset.itemType);
        });
    });
}

// ===========================
// Firestore 추가
// ===========================

async function addToCollection(itemId, type) {
    try {
        // 1) 이미 같은 tmdbId + type 이 있는지 검사
        const dupSnap = await db.collection('movies')
            .where('tmdbId', '==', Number(itemId))  // TMDB id
            .where('type', '==', type)             // movie / tv
            .limit(1)
            .get();

        if (!dupSnap.empty) {
            alert('이미 컬렉션에 추가된 작품입니다.');
            searchResults.innerHTML = '';  // 혹시 로딩 표시 제거
            return; // 👉 여기서 바로 종료, 밑으로 안 내려감
        }

        // 2) 여기부터는 "없을 때만" 기존 로직 실행
        searchResults.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading"></div></div>';

        let itemData;

        if (type === 'movie') {
            const details = await window.getMovieDetails(itemId);
            const trailer = await window.getMovieTrailer(itemId);
            const backdrops = await window.getMovieBackdrops(itemId);
            
            let randomBackdrop = '';
            if (backdrops && backdrops.length > 0) {
                randomBackdrop = backdrops[Math.floor(Math.random() * backdrops.length)].file_path;
            }
            
            const streamingUrl = prompt(`"${details.title}" 스트리밍 링크:`, '');
            
            itemData = {
                type: 'movie',
                tmdbId: details.id,
                title: details.title,
                year: details.release_date ? details.release_date.split('-')[0] : 'N/A',
                posterPath: details.poster_path || '',
                backdropPath: randomBackdrop || details.backdrop_path || '',
                overview: details.overview || '',
                runtime: details.runtime || 0,
                genres: details.genres ? details.genres.map(g => g.name).join(', ') : '',
                cast: details.cast ? details.cast.slice(0, 5).map(c => c.name).join(', ') : '',
                trailerUrl: trailer || '',
                externalVideoUrl: streamingUrl || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
        } else {
            const details = await window.getTVDetails(itemId);
            const trailer = await window.getTVTrailer(itemId);
            const backdrops = await window.getTVBackdrops(itemId);
            
            let randomBackdrop = '';
            if (backdrops && backdrops.length > 0) {
                randomBackdrop = backdrops[Math.floor(Math.random() * backdrops.length)].file_path;
            }
            
            itemData = {
                type: 'tv',
                tmdbId: details.id,
                title: details.name,
                year: details.first_air_date ? details.first_air_date.split('-')[0] : 'N/A',
                posterPath: details.poster_path || '',
                backdropPath: randomBackdrop || details.backdrop_path || '',
                overview: details.overview || '',
                runtime: (details.episode_run_time && details.episode_run_time.length > 0) ? details.episode_run_time[0] : 0,
                seasons: details.number_of_seasons || 0,
                episodes: details.number_of_episodes || 0,
                genres: details.genres ? details.genres.map(g => g.name).join(', ') : '',
                cast: details.cast ? details.cast.slice(0, 5).map(c => c.name).join(', ') : '',
                trailerUrl: trailer || '',
                episodeList: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
        }
        
        await db.collection('movies').add(itemData);
        closeModal(searchModal);
        loadMovies();
        alert(`"${itemData.title}" 추가 완료!`);
        
    } catch (error) {
        console.error('추가 오류:', error);
        alert('추가 실패!');
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
        
        console.log(`${allMovies.length}개 로드 완료`);
        displayHeroSlide();
        filterAndDisplayMovies();
        
    } catch (error) {
        console.error('로드 오류:', error);
    }
}

// ===========================
// 히어로
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
    
    const backdrops = featuredMovie.type === 'tv' 
        ? await window.getTVBackdrops(featuredMovie.tmdbId)
        : await window.getMovieBackdrops(featuredMovie.tmdbId);
    
    let backdropUrl;
    if (backdrops && backdrops.length > 0) {
        backdropUrl = `https://image.tmdb.org/t/p/original${backdrops[Math.floor(Math.random() * backdrops.length)].file_path}`;
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
        const movieDetails = featuredMovie.type === 'tv'
            ? await window.getTVDetails(featuredMovie.tmdbId)
            : await window.getMovieDetails(featuredMovie.tmdbId);
        const directorName = movieDetails.director ? movieDetails.director.name : '정보 없음';
        
        document.querySelector('.hero-meta').innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                <span class="rating-icon" id="hero-rating-mobile" style="font-size: 0.85em;">${featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒'}</span>
                <span style="color: var(--text-secondary); font-size: 0.8rem;">${featuredMovie.year || 'N/A'}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">·</span>
                <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">DIRECTED BY</span>
            </div>
            <div style="font-size: 0.8rem; font-weight: 400; color: var(--text-primary); margin-bottom: 5px;">${directorName}</div>
        `;
        
                // 버튼 영역 (TV/영화 구분)
if (featuredMovie.type === 'tv') {
    // TV: 에피소드 버튼만 표시 (Trailer 제거) ✅
    const episodes = featuredMovie.episodeList || [];
    const episodeButtons = episodes.map(ep => 
        `<button class="btn-secondary btn-episode" data-url="${ep.url}" style="padding: 6px 10px; font-size: 0.65rem;">${ep.title}</button>`
    ).join('');
    
    document.querySelector('.hero-actions').innerHTML = `
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${episodeButtons || '<p style="color: var(--text-muted); font-size: 0.7rem;">에피소드 없음. 🔒 아이콘을 눌러 추가하세요.</p>'}
        </div>
    `;
    
    // 에피소드 버튼 이벤트
    document.querySelectorAll('.btn-episode').forEach(btn => {
        btn.onclick = () => {
            const url = btn.dataset.url;
            if (url && url.trim()) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noreferrer noopener';
                link.click();
            } else {
                alert('URL이 설정되지 않았습니다.');
            }
        };
    });
    
    // 👇 TV일 때도 hero-rating-mobile 이벤트 설정!
    const ratingIcon = document.getElementById('hero-rating-mobile');
    if (ratingIcon) {
        ratingIcon.onclick = () => {
            openEpisodeModal(featuredMovie);
        };
    }
    
} else {
    // 영화: 기존 버튼
    document.querySelector('.hero-actions').innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Play</button>
            <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
        </div>
    `;
    
    setupMobileHeroButtons(featuredMovie); // ✅ 이미 hero-rating-mobile 이벤트 설정됨
}



        
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

async function displayHeroCredits(movie) {
    try {
        const movieDetails = movie.type === 'tv'
            ? await window.getTVDetails(movie.tmdbId)
            : await window.getMovieDetails(movie.tmdbId);
        
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
        console.error('크레딧 오류:', error);
    }
}
// ===========================
// 버튼 이벤트 (PC)
// ===========================
function setupHeroButtons(movie) {
    // TV 시리즈인 경우
    if (movie.type === 'tv') {
        const episodes = movie.episodeList || [];
        const episodeButtons = episodes.map(ep => 
            `<button class="btn-secondary btn-episode-pc" data-url="${ep.url}" style="padding: 10px 16px; font-size: 0.85rem; margin-right: 8px; margin-bottom: 8px;">${ep.title}</button>`
        ).join('');
        
        document.querySelector('.hero-actions').innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${episodeButtons || '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">에피소드가 없습니다. 🔒 아이콘을 클릭하여 추가하세요.</p>'}
            </div>
        `;
        
        // 에피소드 재생 버튼들
        document.querySelectorAll('.btn-episode-pc').forEach(btn => {
            btn.onclick = () => {
                const url = btn.dataset.url;
                if (url && url.trim()) {
                    window.open(url, '_blank', 'noreferrer,noopener');
                } else {
                    alert('URL이 설정되지 않았습니다.');
                }
            };
        });
        
        // 등급 아이콘 - 에피소드 관리 열기
        document.getElementById('hero-rating').onclick = () => {
            openEpisodeModal(movie);
        };
        
        return; // TV는 여기서 종료
    }
    
    // ✅ 영화인 경우 - HTML도 다시 생성! (이 부분이 핵심!)
    document.querySelector('.hero-actions').innerHTML = `
        <button id="hero-trailer-btn" class="btn-secondary">Trailer</button>
        <button id="hero-play-btn" class="btn-secondary">Watch Now</button>
        <button id="hero-nplayer-btn" class="btn-secondary">NPlayer</button>
    `;
    
    // 이벤트 설정
    document.getElementById('hero-trailer-btn').onclick = () => {
        if (movie.trailerUrl) {
            playTrailer(movie.trailerUrl);
        } else {
            alert('예고편이 없습니다.');
        }
    };
    
    document.getElementById('hero-play-btn').onclick = () => {
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
    
    document.getElementById('hero-nplayer-btn').onclick = () => {
        if (movie.externalVideoUrl && movie.externalVideoUrl.trim()) {
            const link = document.createElement('a');
            link.href = `nplayer-${movie.externalVideoUrl}`;
            link.click();
        } else {
            alert('재생 URL이 설정되지 않았습니다.');
        }
    };
    
    document.getElementById('hero-rating').onclick = async () => {
        const currentUrl = movie.externalVideoUrl || '';
        const newUrl = prompt(`"${movie.title}" 재생 URL:\n\n현재: ${currentUrl || '(없음)'}`, currentUrl);
        
        if (newUrl === null) return;
        
        try {
            await db.collection('movies').doc(movie.id).update({ externalVideoUrl: newUrl.trim() });
            movie.externalVideoUrl = newUrl.trim();
            document.getElementById('hero-rating').textContent = newUrl.trim() ? '🔓' : '🔒';
            
            const movieInList = allMovies.find(m => m.id === movie.id);
            if (movieInList) movieInList.externalVideoUrl = newUrl.trim();
            
            alert('URL 저장 완료!');
        } catch (error) {
            console.error('URL 저장 오류:', error);
            alert('URL 저장 실패!');
        }
    };
}




// ===========================
// 버튼 이벤트 (모바일)
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
            if (movie.type === 'tv') {
                openEpisodeModal(movie);
            } else {
                const currentUrl = movie.externalVideoUrl || '';
                const newUrl = prompt(`"${movie.title}" 재생 URL:\n\n현재: ${currentUrl || '(없음)'}`, currentUrl);
                
                if (newUrl === null) return;
                
                try {
                    await db.collection('movies').doc(movie.id).update({ externalVideoUrl: newUrl.trim() });
                    movie.externalVideoUrl = newUrl.trim();
                    ratingIcon.textContent = newUrl.trim() ? '🔓' : '🔒';
                    
                    const movieInList = allMovies.find(m => m.id === movie.id);
                    if (movieInList) movieInList.externalVideoUrl = newUrl.trim();
                    
                    alert('URL 저장 완료!');
                } catch (error) {
                    console.error('URL 저장 오류:', error);
                    alert('URL 저장 실패!');
                }
            }
        };
    }
}  



function playTrailer(trailerUrl) {
    if (!trailerUrl) {
        alert('예고편이 없습니다.');
        return;
    }
    
    let embedUrl = trailerUrl;
    if (trailerUrl.includes('youtube.com/watch')) {
        const videoId = trailerUrl.split('v=')[1].split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (trailerUrl.includes('youtu.be/')) {
        const videoId = trailerUrl.split('youtu.be/')[1];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    videoPlayer.src = embedUrl;
    openModal(videoModal);
}
// ===========================
// 필터링
// ===========================

function filterAndDisplayMovies() {
    let filteredMovies = allMovies;
    
    if (currentTab === 'movie') {
        filteredMovies = allMovies.filter(m => m.type === 'movie');
        document.getElementById('section-title').textContent = '영화 컬렉션';
    } else if (currentTab === 'tv') {
        filteredMovies = allMovies.filter(m => m.type === 'tv');
        document.getElementById('section-title').textContent = 'TV 시리즈 컬렉션';
    } else {
        document.getElementById('section-title').textContent = '전체 컬렉션';
    }
    
    displayMovies(filteredMovies);
}

// ===========================
// 그리드 표시
// ===========================

function displayMovies(moviesToDisplay = allMovies) {
    if (!moviesToDisplay || moviesToDisplay.length === 0) {
        moviesGrid.innerHTML = '<p style="color: var(--text-secondary); padding: 40px; text-align: center; grid-column: 1 / -1;">아직 추가된 항목이 없습니다.</p>';
        return;
    }
    
    moviesGrid.innerHTML = moviesToDisplay.map((movie, index) => {
        const typeIcon = movie.type === 'tv' ? '📺' : '🎬';
        const runtimeText = movie.type === 'tv' 
            ? `S${movie.seasons || '?'} E${movie.episodes || '?'}`
            : (movie.year || 'N/A');
        
        return `
            <div class="movie-card" data-movie-id="${movie.id}" data-movie-index="${index}">
                <img src="${window.getPosterUrl(movie.posterPath)}" alt="${movie.title}"
                     onerror="this.src='https://via.placeholder.com/300x450/2C3440/99AABB?text=No+Image'">
                <div class="movie-card-overlay">
                    <div class="movie-card-title">${typeIcon} ${movie.title}</div>
                    <div class="movie-card-year">${runtimeText}</div>
                    <div class="movie-card-actions">
                        <button class="btn-small btn-trailer" data-trailer="${movie.trailerUrl || ''}">예고편</button>
                        <button class="btn-small btn-play" data-url="${movie.externalVideoUrl || ''}">Play</button>
                        <button class="btn-small btn-nplayer" data-url="${movie.externalVideoUrl || ''}">NPlayer</button>
                        <button class="btn-small btn-delete" data-movie-id="${movie.id}">삭제</button>
                    </div>
                </div>
                <div class="movie-card-info">
                    <div class="movie-card-info-title">${typeIcon} ${movie.title}</div>
                    <div class="movie-card-info-year">${runtimeText}</div>
                </div>
            </div>
        `;
    }).join('');
    
    attachMovieCardEvents();
}
// ===========================
// 카드 이벤트
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
// 삭제
// ===========================

async function deleteMovie(movieId) {
    const movie = allMovies.find(m => m.id === movieId);
    if (!movie || !confirm(`"${movie.title}" 삭제하시겠습니까?`)) return;
    
    try {
        await db.collection('movies').doc(movieId).delete();
        allMovies = allMovies.filter(m => m.id !== movieId);
        displayHeroSlide();
        filterAndDisplayMovies();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 실패!');
    }
}

// ===========================
// 히어로 변경
// ===========================

async function changeHeroMovie(index) {
    if (!allMovies || !allMovies[index]) return;
    
    const featuredMovie = allMovies[index];
    
    const backdrops = featuredMovie.type === 'tv' 
        ? await window.getTVBackdrops(featuredMovie.tmdbId)
        : await window.getMovieBackdrops(featuredMovie.tmdbId);
    
    let backdropUrl;
    if (backdrops && backdrops.length > 0) {
        backdropUrl = `https://image.tmdb.org/t/p/original${backdrops[Math.floor(Math.random() * backdrops.length)].file_path}`;
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
        const movieDetails = featuredMovie.type === 'tv'
            ? await window.getTVDetails(featuredMovie.tmdbId)
            : await window.getMovieDetails(featuredMovie.tmdbId);
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
        
                // 버튼 영역 (TV/영화 구분)
if (featuredMovie.type === 'tv') {
    // TV: 에피소드 버튼만 표시 ✅
    const episodes = featuredMovie.episodeList || [];
    const episodeButtons = episodes.map(ep => 
        `<button class="btn-secondary btn-episode" data-url="${ep.url}" style="padding: 6px 10px; font-size: 0.65rem;">${ep.title}</button>`
    ).join('');
    
    document.querySelector('.hero-actions').innerHTML = `
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${episodeButtons || '<p style="color: var(--text-muted); font-size: 0.7rem;">에피소드 없음. 🔒 아이콘을 눌러 추가하세요.</p>'}
        </div>
    `;
    
    // 에피소드 버튼 이벤트
    document.querySelectorAll('.btn-episode').forEach(btn => {
        btn.onclick = () => {
            const url = btn.dataset.url;
            if (url && url.trim()) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noreferrer noopener';
                link.click();
            } else {
                alert('URL이 설정되지 않았습니다.');
            }
        };
    });
    
    // 👇 TV일 때도 hero-rating-mobile 이벤트 설정!
    const ratingIcon = document.getElementById('hero-rating-mobile');
    if (ratingIcon) {
        ratingIcon.onclick = () => {
            openEpisodeModal(featuredMovie);
        };
    }
    
} else {
    // 영화: 기존 버튼
    document.querySelector('.hero-actions').innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <button id="hero-trailer-btn-mobile" class="btn-secondary" style="padding: 7px 12px; font-size: 0.7rem;">Trailer</button>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A'}</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="hero-play-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">Play</button>
            <button id="hero-nplayer-btn-mobile" class="btn-secondary" style="flex: 1; padding: 7px; font-size: 0.7rem;">NPlayer</button>
        </div>
    `;
    
    setupMobileHeroButtons(featuredMovie);
}


     } else {
        document.getElementById('hero-rating').textContent = featuredMovie.externalVideoUrl && featuredMovie.externalVideoUrl.trim() ? '🔓' : '🔒';
        document.getElementById('hero-year').textContent = featuredMovie.year || 'N/A';
        document.getElementById('hero-runtime').textContent = featuredMovie.runtime ? `${featuredMovie.runtime}분` : 'N/A';
        document.getElementById('hero-genres').textContent = featuredMovie.genres || 'N/A';
        document.getElementById('hero-overview').textContent = truncateOverview(featuredMovie.overview);
        
        displayHeroCredits(featuredMovie);
        setupHeroButtons(featuredMovie);
    }
}



// ===========================
// 에피소드 관리 모달
// ===========================

// 👇 여기에 추가!
episodeModal.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this);
});
    
function openEpisodeModal(movie) {
    currentEditingMovie = movie;
    document.getElementById('episode-modal-title').textContent = `${movie.title} - 에피소드 관리`;
    
    renderEpisodeList();
    openModal(episodeModal);
}

function renderEpisodeList() {
    const episodes = currentEditingMovie.episodeList || [];
    
    if (episodes.length === 0) {
        episodeList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">에피소드를 추가하세요.</p>';
    } else {
        episodeList.innerHTML = episodes.map((ep, index) => `
            <div class="episode-row" data-index="${index}" style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
                <input type="text" value="${ep.title}" placeholder="제목 (예: 1화)" 
                       class="episode-title" data-index="${index}"
                       style="width: 100px; padding: 8px; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 0.85rem;">
                <input type="text" value="${ep.url}" placeholder="URL" 
                       class="episode-url" data-index="${index}"
                       style="flex: 1; padding: 8px; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 0.85rem;">
                <button class="btn-delete-episode" data-index="${index}" 
                        style="padding: 6px 12px; font-size: 0.75rem; background: rgba(255, 50, 50, 0.2); border: 1px solid rgba(255, 50, 50, 0.4); color: #ff5555; border-radius: 4px; cursor: pointer;">삭제</button>
            </div>
        `).join('');
        
        // 삭제 버튼 이벤트
        document.querySelectorAll('.btn-delete-episode').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                episodes.splice(index, 1);
                renderEpisodeList();
            });
        });
    }
}

// + 에피소드 추가 버튼
addEpisodeBtn.addEventListener('click', () => {
    if (!currentEditingMovie.episodeList) {
        currentEditingMovie.episodeList = [];
    }
    
    const newEpisodeNum = currentEditingMovie.episodeList.length + 1;
    currentEditingMovie.episodeList.push({
        title: `${newEpisodeNum}화`,
        url: ''
    });
    
    renderEpisodeList();
});

// 저장 버튼
saveEpisodesBtn.addEventListener('click', async () => {
    try {
        // 입력값 수집
        const episodes = [];
        const titles = document.querySelectorAll('.episode-title');
        const urls = document.querySelectorAll('.episode-url');
        
        titles.forEach((titleInput, index) => {
            const title = titleInput.value.trim();
            const url = urls[index].value.trim();
            
            if (title) {  // 제목이 있으면 추가
                episodes.push({ title, url });
            }
        });
        
        // Firestore 업데이트
        await db.collection('movies').doc(currentEditingMovie.id).update({
            episodeList: episodes
        });
        
        // 로컬 업데이트
        currentEditingMovie.episodeList = episodes;
        const movieInList = allMovies.find(m => m.id === currentEditingMovie.id);
        if (movieInList) movieInList.episodeList = episodes;
        
        closeModal(episodeModal);
        
        // 히어로 다시 표시 (에피소드 버튼 업데이트)
        if (window.innerWidth <= 480) {
            displayHeroSlide();
        }
        
        alert('에피소드 저장 완료!');
    } catch (error) {
        console.error('에피소드 저장 오류:', error);
        alert('저장 실패!');
    }
});
