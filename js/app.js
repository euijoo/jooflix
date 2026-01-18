// ========== 전역 변수 ==========
let allMovies = [];

// ========== jQuery 초기화 ==========
$(document).ready(function() {
    // DOM 요소 선택
    const searchModal = document.getElementById('search-modal');
    const searchBtnNav = document.getElementById('search-btn-nav');
    const addMovieBtn = document.getElementById('add-movie-btn');
    const searchInput = document.getElementById('movie-search-input');
    const searchResults = document.getElementById('search-results');

    // ========== 햄버거 메뉴 ==========
    $('#hamburger-menu').click(function() {
        $(this).toggleClass('active');
        $('#nav-menu').toggleClass('active');
    });

    // ========== 영화 캐러셀 ==========
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
            }
        });
    });

    // ========== TMDB 검색 ==========
    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        if (!query) {
            searchResults.innerHTML = '';
            return;
        }

        try {
            const results = await tmdbAPI.searchMovies(query);
            displaySearchResults(results);
        } catch (error) {
            console.error('검색 오류:', error);
const results = await searchMovies(query);        }
    });

    // 초기 로드
    loadMoviesFromDB();
});

// ========== TMDB 검색 결과 표시 ==========
function displaySearchResults(movies) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';

    if (movies.length === 0) {
        searchResults.innerHTML = '<p class="no-results">검색 결과가 없습니다.</p>';
        return;
    }

    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'search-result-item';
        movieCard.innerHTML = `
            <img src="${tmdbAPI.getImageUrl(movie.poster_path)}" alt="${movie.title}">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                <p class="rating">⭐ ${movie.vote_average.toFixed(1)}</p>
            </div>
        `;
        movieCard.addEventListener('click', () => addMovieToCollection(movie));
        searchResults.appendChild(movieCard);
    });
}

// ========== 커석션에 영화 추가 ==========
async function addMovieToCollection(movie) {
    try {
        const movieData = {
            id: movie.id,
            title: movie.title,
            poster: tmdbAPI.getImageUrl(movie.poster_path),
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            rating: movie.vote_average.toFixed(1)
        };

        await db.addMovie(movieData);
        await loadMoviesFromDB();

        document.getElementById('search-modal').style.display = 'none';
        document.getElementById('movie-search-input').value = '';
        document.getElementById('search-results').innerHTML = '';

        alert('영화가 커석션에 추가되었습니다!');
    } catch (error) {
        console.error('영화 추가 오류:', error);
        alert('영화 추가에 실패했습니다.');
    }
}

// ========== DB에서 영화 목록 불러오기 ==========
async function loadMoviesFromDB() {
    try {
        allMovies = await db.getMovies();
        displayMovies(allMovies);
    } catch (error) {
        console.error('영화 불러오기 오류:', error);
    }
}

// ========== 영화 표시 ==========
function displayMovies(movies) {
    const moviesContainer = document.getElementById('movies-carousel');
    moviesContainer.innerHTML = '';

    if (movies.length === 0) {
        moviesContainer.innerHTML = '<p class="no-movies">커석션에 영화가 없습니다. 영화를 추가해보세요!</p>';
        return;
    }

    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.innerHTML = `
            <img src="${movie.poster}" alt="${movie.title}">
            <div class="movie-overlay">
                <h3>${movie.title}</h3>
                <p>${movie.year} · ⭐${movie.rating}</p>
                <div class="movie-actions">
                    <button class="btn-play" onclick="playTrailer(${movie.id})">
                        <i class='bx bx-play'></i>
                    </button>
                    <button class="btn-delete" onclick="deleteMovie('${movie.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `;
        moviesContainer.appendChild(movieCard);
    });

    // 캐러셀 재초기화
    $('#movies-carousel').trigger('destroy.owl.carousel');
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
}

// ========== 트레일러 재생 ==========
async 209
    (movieId) {
    try {
        const videos = await tmdbAPI.getMovieVideos(movieId);
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        if (trailer && trailer.key) {
            // YouTube 비디오 ID 유효성 검사
            const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;
            if (!youtubeIdPattern.test(trailer.key)) {
                console.error('유효하지 않은 YouTube ID:', trailer.key);
                alert('유효하지 않은 트레일러 영상입니다.');
                return;
            }

            document.getElementById('video-player').src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&enablejsapi=1&modestbranding=1&origin=${window.location.origin}`;
            document.getElementById('video-modal').style.display = 'flex';
        } else {
            alert('트레일러를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('트레일러 로드 오류:', error);
        alert('트레일러를 불러오는데 실패했습니다.');
    }
}

// ========== 영화 삭제 ==========
async function deleteMovie(movieId) {
    if (!confirm('정말 이 영화를 삭제하시겠습니까?')) {
        return;
    }

    try {
        await db.deleteMovie(movieId);
        await loadMoviesFromDB();
        alert('영화가 삭제되었습니다.');
    } catch (error) {
        console.error('영화 삭제 오류:', error);
        alert('영화 삭제에 실패했습니다.');
    }
}
