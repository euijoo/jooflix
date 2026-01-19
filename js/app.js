// ========== 전역 변수 (전체 앱에서 공유하는 상태) ==========
let allMovies = []; // Firestore에서 불러온 내 영화 컬렉션을 모두 저장하는 배열
const searchModal = document.getElementById('search-modal');       // 검색/영화추가 모달 DOM
const searchBtnNav = document.getElementById('search-btn-nav');   // 상단 메뉴의 검색 버튼
const addMovieBtn = document.getElementById('add-movie-btn');     // "영화 추가" 버튼
const searchInput = document.getElementById('movie-search-input'); // 모달 안의 검색 인풋
const searchResults = document.getElementById('search-results');   // 검색 결과 리스트 DOM


// ========== jQuery 초기화 (탑메뉴, 메인 영화 캐러셀 세팅) ==========
$(document).ready(function() {
    // 햄버거 메뉴 클릭 시 모바일에서 상단 메뉴 열기/닫기
    $('#hamburger-menu').click(function() {
        $(this).toggleClass('active');
        $('#nav-menu').toggleClass('active');
    });
    
    // 메인 영화 리스트 캐러셀(가로 스크롤 슬라이더) 초기화
    // - #movies-carousel 요소에 OwlCarousel 플러그인을 적용
    // - 반응형으로 화면 크기에 따라 보여주는 포스터 개수 조절
    $('#movies-carousel').owlCarousel({
  items: 4,           // 0px 이상 기본 4개
  dots: false,
  nav: true,
  navText: ["<i class='bx bx-chevron-left'></i>", "<i class='bx bx-chevron-right'></i>"],
  margin: 15,
  loop: false,
  responsive: {
      1280: { items: 6 }, // 1280px 이상: 6개
      1600: { items: 6 }
  }
});


// ========== 모달 제어 (검색/영화 추가/비디오 모달 열기·닫기) ==========
searchBtnNav.addEventListener('click', () => {
    // 상단 네비게이션의 검색 버튼 클릭 시 검색 모달 열기
    searchModal.style.display = 'flex';
    searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
    // "영화 추가" 버튼 클릭 시도 같은 검색 모달 재사용
    searchModal.style.display = 'flex';
    searchInput.focus();
});

// 각 모달의 닫기(X) 버튼 클릭 시 모달 닫기
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        modal.style.display = 'none';
        
        // 비디오 모달일 경우, iframe src 제거해서 재생 중지
        if (modal.id === 'video-modal') {
            document.getElementById('video-player').src = '';
        }
    });
});

// 모달의 어두운 배경 영역 클릭 시 모달 닫기
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            
            // 비디오 모달일 경우, iframe src 제거해서 재생 중지
            if (modal.id === 'video-modal') {
                document.getElementById('video-player').src = '';
            }
        }
    });
});


// ========== 검색 (TMDB에서 영화 검색 → 결과 리스트 표시) ==========
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    // 입력마다 이전 타이머 제거해서 디바운싱
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    // 2글자 미만이면 검색하지 않고 결과 영역 비우기
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }
    
    // 0.5초 동안 추가 입력이 없으면 실제 검색 실행
    searchTimeout = setTimeout(async () => {
        const movies = await searchMovies(query); // TMDB 검색 API 호출 (별도 함수)
        displaySearchResults(movies);
    }, 500);
});

// 검색 결과(여러 영화)를 모달 안에 그려주는 함수
function displaySearchResults(movies) {
    if (movies.length === 0) {
        searchResults.innerHTML = '<p style="text-align: center; color: #888;">검색 결과가 없습니다.</p>';
        return;
    }
    
    // 각 검색 결과 아이템 클릭 시 addMovieToCollection(movie.id) 호출
    // → Firestore에 내 컬렉션으로 추가
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


// ========== Firestore 추가 (선택한 영화 내 컬렉션에 저장) ==========
async function addMovieToCollection(movieId) {
    if (!currentUser) return; // 로그인 안 되어 있으면 종료
    
    try {
        // TMDB에서 영화 상세 정보 가져오기
        const movieDetails = await getMovieDetails(movieId);
        if (!movieDetails) {
            alert('영화 정보를 가져올 수 없습니다.');
            return;
        }
        
        // TMDB에서 예고편(트레일러) URL 가져오기
        const trailerUrl = await getMovieTrailer(movieId);
        
        // Firestore 'movies' 컬렉션에 현재 유저의 영화 문서 추가
        await db.collection('movies').add({
            userId: currentUser.uid,                  // 내 UID로 필터링
            tmdbId: movieDetails.id,                  // TMDB 원본 ID
            title: movieDetails.title,                // 한글/로컬라이즈 제목
            originalTitle: movieDetails.original_title,
            overview: movieDetails.overview,
            posterPath: movieDetails.poster_path,
            backdropPath: movieDetails.backdrop_path,
            releaseDate: movieDetails.release_date,
            runtime: movieDetails.runtime,
            genres: movieDetails.genres,              // [{ id, name }, ...]
            cast: movieDetails.cast.map(actor => ({
                name: actor.name,
                character: actor.character,
                profilePath: actor.profile_path
            })),
            externalVideoUrl: '',                     // 사용자가 직접 넣는 재생 URL (초기에는 비어 있음)
            trailerUrl: trailerUrl || '',            // 예고편 URL (없으면 빈 문자열)
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`${movieDetails.title} 추가!`);
        // 모달 초기화 & 닫기
        searchModal.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
        // 추가 후 다시 내 영화 목록 로드
        loadMovies();
    } catch (error) {
        console.error('추가 오류:', error);
        alert('추가 실패');
    }
}


// ========== Firestore 로드 (내 영화 컬렉션 불러오기) ==========
async function loadMovies() {
    if (!currentUser) return;
    
    try {
        // 현재 로그인한 사용자의 영화만 createdAt 최신순으로 가져오기
        const snapshot = await db.collection('movies')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        // allMovies 배열을 새로 채우기
        allMovies = [];
        snapshot.forEach(doc => {
            allMovies.push({ id: doc.id, ...doc.data() });
        });
        
        // 아래 영화 캐러셀에 표시
        displayMovies(allMovies);
        
        // 히어로에는 영화가 있다면 랜덤 1개, 없다면 빈 상태 메시지 표시
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


// ========== 히어로 슬라이드 (상단 큰 배경 + 메인 영화 정보) ==========
function displayHeroSlide(movie) {
    const heroCarousel = $('#hero-carousel'); // 히어로 영역 컨테이너
    
    // 내 컬렉션에 영화가 하나도 없을 때: "영화를 추가해주세요" 화면
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
    
    // movie 객체를 기반으로 히어로 영역의
    // - 큰 배경 이미지(backdrop)
    // - 제목, 연도, 러닝타임, 장르
    // - Trailer / Play / NPlayer 버튼을 동적으로 구성
    heroCarousel.html(`
        <div class="hero-slide-item">
            <img src="${getBackdropUrl(movie.backdropPath)}" alt="${movie.title}">
            <div class="hero-slide-item-content">
                <h2 class="item-content-title">${movie.title}</h2>
                <!-- 영화 기본 정보 영역 (연도, 시간, 장르) -->
                <div class="movie-infos" style="margin-top: 20px;">
                    ${movie.releaseDate ? `
  <div class="movie-info">
    <!-- 캘린더 아이콘을 클릭하면 showMovieOptions 호출 (URL 수정 / 삭제) -->
    <i class='bx bx-calendar' onclick="event.stopPropagation(); showMovieOptions('${movie.id}')" style="cursor: pointer;" title="영화 설정"></i>
    <span>${movie.releaseDate.substring(0, 4)}</span>
  </div>
` : ''}

                    ${movie.runtime ? `<div class="movie-info"><i class='bx bx-time'></i><span>${movie.runtime}분</span></div>` : ''}
                    ${movie.genres && movie.genres.length > 0 ? `<div class="movie-info"><i class='bx bx-category'></i><span>${movie.genres[0].name}</span></div>` : ''}
                </div>
               </div>
                <!-- 예고편, 외부 영상, nPlayer 실행 버튼 영역 -->
                <div class="item-action" style="margin-top: 30px; display: flex; gap: 15px;">
                    ${movie.trailerUrl ? `
    <button class="btn btn-hover" onclick="openVideoInModal('${movie.trailerUrl.replace(/'/g, "\\'")}')">
        <i class='bx bx-play-circle'></i><span>Trailer</span>
    </button>
` : ''}
                    ${movie.externalVideoUrl ? `
                        <button class="btn btn-hover" onclick="openVideoInNewTab('${movie.externalVideoUrl.replace(/'/g, "\\'")}')">
                        <i class='bx bx-play'></i><span>Play</span>                        </button>
                        <button class="btn btn-hover" onclick="playWithNPlayer('${movie.externalVideoUrl.replace(/'/g, "\\'")}')">
                            <i class='bx bx-movie'></i><span>NPlayer</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `);
}

// 히어로 배경(backdrop) 이미지 URL 생성
function getBackdropUrl(backdropPath) {
    if (!backdropPath) return 'https://via.placeholder.com/1920x1080?text=No+Image';
    return `https://image.tmdb.org/t/p/original${backdropPath}`;
}


// ========== 영화 캐러셀 (내 영화 리스트 UI) ==========
function displayMovies(movies) {
    const moviesCarousel = $('#movies-carousel');
    
    // 영화가 하나도 없으면 캐러셀 대신 안내 문구 + "영화 추가" 버튼만 표시
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
    
    // 기존 캐러셀 인스턴스 제거 후 새로 렌더링 (데이터 변경 대응)
    moviesCarousel.trigger('destroy.owl.carousel');
    
    // 각 영화 포스터 카드 HTML 생성
    // - 카드 전체 클릭: 해당 영화를 히어로로 이동 (goToHeroSlide)
    // - ⋮ 버튼 클릭: showMovieOptions (URL 수정/삭제)
    // - PC / N 버튼: 각각 새 탭/ nPlayer로 재생
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
    
    // 영화 리스트 영역에 OwlCarousel 다시 적용
    moviesCarousel.owlCarousel({
        items: 2,
        dots: false,
        nav: true,
        navText: ["<i class='bx bx-chevron-left'></i>", "<i class='bx bx-chevron-right'></i>"],
        margin: 15,
        loop: false,
        responsive: {
            500:  { items: 4 },
            1280: { items: 6 },
            1600: { items: 6 }
        }
    });
}


// ========== 히어로 이동 (아래 리스트에서 선택한 영화 → 위 히어로로 표시) ==========
function goToHeroSlide(index) {
    if (!allMovies || index >= allMovies.length) return;
    
    const selectedMovie = allMovies[index];
    // 히어로 영역 내용 교체
    displayHeroSlide(selectedMovie);
    
    // 페이지 스크롤을 히어로 영역 위치로 부드럽게 이동
    $('html, body').animate({
        scrollTop: $('.hero-slide').offset().top - 60
    }, 500);
}


// ========== 비디오 재생 (Trailer 버튼: 유튜브 새 탭) ==========
function openVideoInModal(videoUrl) {
    if (!videoUrl) {
        alert('영상 URL이 없습니다.');
        return;
    }
    
    // 원래는 모달에 iframe으로 재생 가능하지만,
    // 현재는 간단히 YouTube(또는 외부 링크)를 새 탭으로 열도록 구현
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
}


// ========== 옵션 (URL 수정 / 영화 삭제) ==========
async function showMovieOptions(movieId) {
    // Firestore에서 해당 영화 문서 다시 가져오기
    const movie = await getMovieData(movieId);
    if (!movie) return;
    
    // 확인: URL 수정 / 취소: 영화 삭제
    const action = confirm(`${movie.title}\n\n확인: URL 수정\n취소: 영화 삭제`);
    
    if (action) {
        // 외부 재생용 영상 URL 입력받기 (PC / nPlayer 공통으로 사용)
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
        // URL 변경 후 리스트/히어로 다시 로드
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


// (중복 정의된 deleteMovie는 실제로 한 개만 필요, 아래 함수는 제거해도 됨)
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


// ========== 영상 재생 함수들 (Play / NPlayer) ==========
function openVideoInNewTab(videoUrl) {
    // PC 재생용: 브라우저 새 탭에서 영상 URL 열기
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
}

function playWithNPlayer(videoUrl) {
    // nPlayer용 URL 스킴을 이용해 외부 앱으로 넘기기
    // 예: nplayer-http://, nplayer-https:// 등 iOS에서 인식하는 스킴 사용
    const link = document.createElement('a');
    link.href = `nplayer-${videoUrl}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
}
