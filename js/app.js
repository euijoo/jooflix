// ========== DOM 요소 ==========
const searchModal = document.getElementById('search-modal');
const searchBtnNav = document.getElementById('search-btn-nav');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('movie-search-input');
const searchResults = document.getElementById('search-results');

// ========== jQuery 초기화 ==========
$(document).ready(function() {
    // 햄버거 메뉴
    $('#hamburger-menu').click(function() {
        $(this).toggleClass('active');
        $('#nav-menu').toggleClass('active');
    });
    
    // Owl Carousel 네비게이션
    let navText = [
        "<i class='bx bx-chevron-left'></i>", 
        "<i class='bx bx-chevron-right'></i>"
    ];
    
    // 히어로 캐러셀
    $('#hero-carousel').owlCarousel({
        items: 1,
        dots: false,
        loop: true,
        nav: true,
        navText: navText,
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: true
    });
    
    // 영화 캐러셀
    $('#movies-carousel').owlCarousel({
        items: 2,
        dots: false,
        nav: true,
        navText: navText,
        margin: 15,
        loop: false,
        responsive: {
            500: { items: 3 },
            1280: { items: 4 },
            1600: { items: 6 }
        }
    });
});
// ========== 모달 제어 ==========
searchBtnNav.addEventListener('click', () => {
    searchModal.style.display = 'flex';
    searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
    searchModal.style.display = 'flex';
    searchInput.focus();
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// ========== 검색 ==========
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const movies = await searchMovies(query);
        displaySearchResults(movies);
    }, 500);
});

function displaySearchResults(movies) {
    if (movies.length === 0) {
        searchResults.innerHTML = '<p style="text-align: center; color: #888;">검색 결과가 없습니다.</p>';
        return;
    }
    
    searchResults.innerHTML = movies.map(movie => `
        <div class="search-result-item" onclick="addMovieToCollection(${movie.id})">
            <img src="${getPosterUrl(movie.poster_path)}" alt="${movie.title}">
            <div class="search-result-info">
                <h3>${movie.title}</h3>
                <p>${movie.release_date ? movie.release_date.substring(0, 4) : ''}</p>
                <p class="overview">${movie.overview || '줄거리 정보 없음'}</p>
            </div>
        </div>
    `).join('');
}
// ========== Firestore 추가 (예고편 포함) ==========
async function addMovieToCollection(movieId) {
    if (!currentUser) return;
    
    try {
        const movieDetails = await getMovieDetails(movieId);
        if (!movieDetails) {
            alert('영화 정보를 가져올 수 없습니다.');
            return;
        }
        
        // 예고편 가져오기
        const trailerUrl = await getMovieTrailer(movieId);
        
        await db.collection('movies').add({
            userId: currentUser.uid,
            tmdbId: movieDetails.id,
            title: movieDetails.title,
            originalTitle: movieDetails.original_title,
            overview: movieDetails.overview,
            posterPath: movieDetails.poster_path,
            backdropPath: movieDetails.backdrop_path,
            releaseDate: movieDetails.release_date,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres,
            cast: movieDetails.cast.map(actor => ({
                name: actor.name,
                character: actor.character,
                profilePath: actor.profile_path
            })),
            externalVideoUrl: '',
            trailerUrl: trailerUrl || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`${movieDetails.title} 추가 완료!`);
        searchModal.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
        loadMovies();
    } catch (error) {
        console.error('추가 오류:', error);
        alert('추가 실패');
    }
}


// ========== Firestore 로드 ==========
async function loadMovies() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('movies')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const movies = [];
        snapshot.forEach(doc => {
            movies.push({ id: doc.id, ...doc.data() });
        });
        
        displayMovies(movies);
        displayHeroSlide(movies);
    } catch (error) {
        console.error('로드 오류:', error);
    }
}
// ========== 히어로 슬라이드 (예고편 버튼 추가) ==========
function displayHeroSlide(movies) {
    const heroCarousel = $('#hero-carousel');
    
    if (movies.length === 0) {
        heroCarousel.trigger('destroy.owl.carousel');
        heroCarousel.html(`
            <div class="hero-slide-item">
                <div class="hero-slide-item-content">
                    <div style="text-align: center; padding: 100px 20px;">
                        <h2 style="font-size: 2rem; margin-bottom: 20px;">영화를 추가해주세요</h2>
                        <button onclick="document.getElementById('add-movie-btn').click()" class="btn btn-hover">
                            <i class='bx bx-plus'></i><span>영화 추가</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
        return;
    }
    
    const heroMovies = movies.slice(0, 5);
    heroCarousel.trigger('destroy.owl.carousel');
    heroCarousel.html(heroMovies.map(movie => `
        <div class="hero-slide-item">
            <img src="${getBackdropUrl(movie.backdropPath)}" alt="${movie.title}">
            <div class="hero-slide-item-content">
                <h2 class="item-content-title top-down delay-2">${movie.title}</h2>
                <div class="movie-infos top-down delay-4">
                    ${movie.releaseDate ? `<div class="movie-info"><i class='bx bx-calendar'></i><span>${movie.releaseDate.substring(0, 4)}</span></div>` : ''}
                    ${movie.runtime ? `<div class="movie-info"><i class='bx bx-time'></i><span>${movie.runtime}분</span></div>` : ''}
                    ${movie.genres && movie.genres.length > 0 ? `<div class="movie-info"><i class='bx bx-category'></i><span>${movie.genres[0].name}</span></div>` : ''}
                </div>
                <div class="item-content-description top-down delay-6">
                    ${movie.overview ? movie.overview.substring(0, 200) + '...' : '줄거리 정보 없음'}
                </div>
                <div class="item-action top-down delay-8">
                    ${movie.trailerUrl ? `
                        <button class="btn btn-hover" onclick="openVideoInNewTab('${movie.trailerUrl}')" style="background-color: #ff0000; border-color: #ff0000;">
                            <i class='bx bx-play-circle'></i><span>예고편</span>
                        </button>
                    ` : ''}
                    ${movie.externalVideoUrl ? `
                        <button class="btn btn-hover" onclick="openVideoInNewTab('${movie.externalVideoUrl}')">
                            <i class='bx bx-play'></i><span>재생</span>
                        </button>
                        <button class="btn btn-hover" onclick="playWithNPlayer('${movie.externalVideoUrl}')" style="background-color: #0078d4; border-color: #0078d4;">
                            <i class='bx bx-movie'></i><span>nPlayer</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join(''));
    
    heroCarousel.owlCarousel({
        items: 1,
        dots: false,
        loop: true,
        nav: true,
        navText: ["<i class='bx bx-chevron-left'></i>", "<i class='bx bx-chevron-right'></i>"],
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: true
    });
}

function getBackdropUrl(backdropPath) {
    if (!backdropPath) return 'https://via.placeholder.com/1920x1080?text=No+Image';
    return `https://image.tmdb.org/t/p/original${backdropPath}`;
}

// ========== 영화 캐러셀 (클릭 시 히어로 이동) ==========
function displayMovies(movies) {
    const moviesCarousel = $('#movies-carousel');
    
    if (movies.length === 0) {
        moviesCarousel.trigger('destroy.owl.carousel');
        moviesCarousel.html(`
            <div style="text-align: center; padding: 60px 20px; color: #888;">
                <p style="font-size: 18px; margin-bottom: 20px;">아직 추가된 영화가 없습니다.</p>
                <button onclick="document.getElementById('add-movie-btn').click()" class="btn btn-hover">
                    <i class='bx bx-plus'></i><span>영화 추가</span>
                </button>
            </div>
        `);
        return;
    }
    
    moviesCarousel.trigger('destroy.owl.carousel');
    moviesCarousel.html(movies.map((movie, index) => `
        <div class="movie-item" onclick="goToHeroSlide(${index})">
            <button class="movie-options" onclick="event.stopPropagation(); showMovieOptions('${movie.id}')">⋮</button>
            <img class="movie-poster" src="${getPosterUrl(movie.posterPath)}" alt="${movie.title}">
            <div class="movie-item-content">
                <h3 class="movie-item-title">${movie.title}</h3>
                <p class="movie-item-year">${movie.releaseDate ? movie.releaseDate.substring(0, 4) : ''}</p>
                ${movie.externalVideoUrl ? `
                    <div class="movie-item-actions">
                        <button class="btn btn-hover" onclick="event.stopPropagation(); openVideoInNewTab('${movie.externalVideoUrl}')">
                            <i class='bx bx-play'></i><span>PC</span>
                        </button>
                        <button class="btn btn-hover" onclick="event.stopPropagation(); playWithNPlayer('${movie.externalVideoUrl}')" style="background-color: #0078d4; border-color: #0078d4;">
                            <i class='bx bx-movie'></i><span>N</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join(''));
    
    moviesCarousel.owlCarousel({
        items: 2,
        dots: false,
        nav: true,
        navText: ["<i class='bx bx-chevron-left'></i>", "<i class='bx bx-chevron-right'></i>"],
        margin: 15,
        loop: false,
        responsive: {
            500: { items: 3 },
            1280: { items: 4 },
            1600: { items: 6 }
        }
    });
}

// ========== 히어로 슬라이드 이동 ==========
function goToHeroSlide(index) {
    // 최대 5개만 히어로에 표시되므로 범위 제한
    const heroIndex = Math.min(index, 4);
    $('#hero-carousel').trigger('to.owl.carousel', [heroIndex, 300]);
    
    // 히어로 영역으로 스크롤
    $('html, body').animate({
        scrollTop: $('.hero-slide').offset().top - 60
    }, 500);
}

// ========== 재생 ==========
function playWithNPlayer(videoUrl) {
    const link = document.createElement('a');
    link.href = `nplayer-${videoUrl}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
}

function openVideoInNewTab(videoUrl) {
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
}

// ========== 옵션 ==========
async function showMovieOptions(movieId) {
    const movie = await getMovieData(movieId);
    if (!movie) return;
    
    const action = confirm(`${movie.title}\n\n확인: URL 수정\n취소: 영화 삭제`);
    
    if (action) {
        const videoUrl = prompt(`영상 URL:`, movie.externalVideoUrl || '');
        if (videoUrl !== null) {
            await updateMovieVideoUrl(movieId, videoUrl);
        }
    } else {
        const confirmDelete = confirm(`${movie.title} 삭제?`);
        if (confirmDelete) {
            await deleteMovie(movieId);
        }
    }
}

// ========== Firestore 함수들 ==========
async function getMovieData(movieId) {
    try {
        const doc = await db.collection('movies').doc(movieId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
        return null;
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        return null;
    }
}

async function updateMovieVideoUrl(movieId, videoUrl) {
    try {
        await db.collection('movies').doc(movieId).update({
            externalVideoUrl: videoUrl
        });
        alert('URL 업데이트 완료!');
        loadMovies();
    } catch (error) {
        console.error('업데이트 오류:', error);
        alert('업데이트 실패');
    }
}

async function deleteMovie(movieId) {
    try {
        await db.collection('movies').doc(movieId).delete();
        alert('영화 삭제 완료');
        loadMovies();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 실패');
    }
}
