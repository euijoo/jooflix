// ========== 전역 변수 ==========
let allMovies = [];
const searchModal = document.getElementById('search-modal');
const searchBtnNav = document.getElementById('search-btn-nav');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('movie-search-input');
const searchResults = document.getElementById('search-results');

// ========== jQuery 초기화 ==========
$(document).ready(function() {
    $('#hamburger-menu').click(function() {
        $(this).toggleClass('active');
        $('#nav-menu').toggleClass('active');
    });
    
    $('#movies-carousel').owlCarousel({
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
        const modal = e.target.closest('.modal');
        modal.style.display = 'none';
        
        // 비디오 모달이면 iframe 정리
        if (modal.id === 'video-modal') {
            document.getElementById('video-player').src = '';
        }
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            
            // 비디오 모달이면 iframe 정리
            if (modal.id === 'video-modal') {
                document.getElementById('video-player').src = '';
            }
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
// ========== Firestore 추가 ==========
async function addMovieToCollection(movieId) {
    if (!currentUser) return;
    
    try {
        const movieDetails = await getMovieDetails(movieId);
        if (!movieDetails) {
            alert('영화 정보를 가져올 수 없습니다.');
            return;
        }
        
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
        
        alert(`${movieDetails.title} 추가!`);
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
        
        allMovies = [];
        snapshot.forEach(doc => {
            allMovies.push({ id: doc.id, ...doc.data() });
        });
        
        displayMovies(allMovies);
        
        if (allMovies.length > 0) {
            const randomIndex = Math.floor(Math.random() * allMovies.length);
            displayHeroSlide(allMovies[randomIndex]);
        } else {
            displayHeroSlide(null);
        }
    } catch (error) {
        console.error('로드 오류:', error);
    }
}
// ========== 히어로 슬라이드 ==========
function displayHeroSlide(movie) {
    const heroCarousel = $('#hero-carousel');
    
    if (!movie) {
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
    
    heroCarousel.html(`
        <div class="hero-slide-item">
            <img src="${getBackdropUrl(movie.backdropPath)}" alt="${movie.title}">
            <div class="hero-slide-item-content">
                <h2 class="item-content-title">${movie.title}</h2>
                <div class="movie-infos">                    ${movie.releaseDate ? `
  <div class="movie-info">
    <i class='bx bx-calendar' onclick="event.stopPropagation(); showMovieOptions('${movie.id}')" style="cursor: pointer;" title="영화 설정"></i>
    <span>${movie.releaseDate.substring(0, 4)}</span>
  </div>
` : ''}

                    ${movie.runtime ? `<div class="movie-info"><i class='bx bx-time'></i><span>${movie.runtime}분</span></div>` : ''}
                    ${movie.genres && movie.genres.length > 0 ? `<div class="movie-info"><i class='bx bx-category'></i><span>${movie.genres[0].name}</span></div>` : ''}
                </div>
               </div>
                <div class="item-action" style="margin-top: 30px; display: flex; gap: 15px;">
                    ${movie.trailerUrl ? `
                    <button class="btn btn-hover btn-trailer" onclick="openVideoInModal('${movie.trailerUrl.replace(/'/g, "\\'")}')">        <i class='bx bx-play-circle'></i><span>Trailer</span>
    </button>
` : ''}
                ${movie.externalVideoUrl ? `
                    <button class="btn btn-hover btn-play" onclick="openVideoInNewTab('${movie.externalVideoUrl.replace(/'/g, "\\'")}')"> <i class='bx bx-play'></i><span>Play</span>
                    </button>
                    <button class="btn btn-hover btn-nplayer" onclick="playWithNPlayer('${movie.externalVideoUrl.replace(/'/g, "\\'")}')"> <i class='bx bx-movie'></i><span>NPlayer</span>
                    </button>
                ` : ''}                    ` : ''}
                </div>
            </div>
        </div>
    `);
}


function getBackdropUrl(backdropPath) {
    if (!backdropPath) return 'https://via.placeholder.com/1920x1080?text=No+Image';
    return `https://image.tmdb.org/t/p/original${backdropPath}`;
}
// ========== 영화 캐러셀 ==========
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
                        <button class="btn btn-hover" onclick="event.stopPropagation(); openVideoInNewTab('${movie.externalVideoUrl.replace(/'/g, "\\'")}')">
                            <i class='bx bx-play'></i><span>PC</span>
                        </button>
                        <button class="btn btn-hover" onclick="event.stopPropagation(); playWithNPlayer('${movie.externalVideoUrl.replace(/'/g, "\\'")}')">
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
// ========== 히어로 이동 ==========
function goToHeroSlide(index) {
    if (!allMovies || index >= allMovies.length) return;
    
    const selectedMovie = allMovies[index];
    displayHeroSlide(selectedMovie);
    
    $('html, body').animate({
        scrollTop: $('.hero-slide').offset().top - 60
    }, 500);
}

// ========== 비디오 재생 ==========
function openVideoInModal(videoUrl) {
    if (!videoUrl) {
        alert('영상 URL이 없습니다.');
        return;
    }
    
    // YouTube를 새 탭에서 열기
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

async function getMovieData(movieId) {
    try {
        const doc = await db.collection('movies').doc(movieId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
        return null;
    } catch (error) {
        console.error('데이터 오류:', error);
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
        alert('삭제 완료');
        loadMovies();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 실패');
    }
}


async function deleteMovie(movieId) {
    try {
        await db.collection('movies').doc(movieId).delete();
        alert('삭제 완료');
        loadMovies();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 실패');
    }
}

// ========== 영상 재생 함수들 ==========
function openVideoInNewTab(videoUrl) {
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
}

function playWithNPlayer(videoUrl) {
    const link = document.createElement('a');
    link.href = `nplayer-${videoUrl}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
}
