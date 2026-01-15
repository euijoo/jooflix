// 영화 검색 모달
const searchModal = document.getElementById('search-modal');
const searchBtn = document.getElementById('search-btn');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('movie-search-input');
const searchResults = document.getElementById('search-results');

// 검색 모달 열기
searchBtn.addEventListener('click', () => {
  searchModal.style.display = 'flex';
  searchInput.focus();
});

addMovieBtn.addEventListener('click', () => {
  searchModal.style.display = 'flex';
  searchInput.focus();
});

// 모달 닫기
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.closest('.modal').style.display = 'none';
  });
});

// 모달 외부 클릭시 닫기
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// 영화 검색
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

// 검색 결과 표시
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
        <p>${movie.release_date ? movie.release_date.substring(0, 4) : '미정'}</p>
        <p class="overview">${movie.overview || '줄거리 없음'}</p>
      </div>
    </div>
  `).join('');
}

// 영화를 Firestore에 추가
async function addMovieToCollection(movieId) {
  if (!currentUser) return;
  
  try {
    const movieDetails = await getMovieDetails(movieId);
    if (!movieDetails) {
      alert('영화 정보를 가져올 수 없습니다.');
      return;
    }
    
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
      nplayerUrl: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert(`"${movieDetails.title}"이(가) 추가되었습니다!`);
    searchModal.style.display = 'none';
    searchInput.value = '';
    searchResults.innerHTML = '';
    loadMovies();
    
  } catch (error) {
    console.error('영화 추가 실패:', error);
    alert('영화 추가에 실패했습니다.');
  }
}

// Firestore에서 영화 목록 불러오기
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
    
  } catch (error) {
    console.error('영화 불러오기 실패:', error);
  }
}

// 영화 그리드에 표시
function displayMovies(movies) {
  const grid = document.getElementById('movies-grid');
  
  if (movies.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #888;">
        <p style="font-size: 18px; margin-bottom: 20px;">아직 추가한 영화가 없습니다.</p>
        <button onclick="document.getElementById('add-movie-btn').click()" class="btn-primary">
          첫 영화 추가하기
        </button>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = movies.map(movie => `
    <div class="movie-card" onclick="showMovieDetail('${movie.id}')">
      <button class="movie-options" onclick="event.stopPropagation(); showMovieOptions('${movie.id}')">⋮</button>
      <img class="movie-poster" src="${getPosterUrl(movie.posterPath)}" alt="${movie.title}">
      <div class="movie-info">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div style="flex: 1; min-width: 0;">
            <h3 class="movie-title" style="margin: 0;">${movie.title}</h3>
            <p class="movie-year" style="margin: 4px 0 0 0;">${movie.releaseDate ? movie.releaseDate.substring(0, 4) : ''}</p>
          </div>
          ${movie.externalVideoUrl ? `
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
             <button 
  class="play-btn" 
  onclick="event.stopPropagation(); openVideoInNewTab('${movie.externalVideoUrl}')"
  title="새 창에서 재생"
  style="padding: 6px 10px; font-size: 11px; background: #e50914; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
  🖥️ PC
</button>
              <button 
                class="play-btn" 
                onclick="event.stopPropagation(); playWithNPlayer('${movie.externalVideoUrl}')"
                title="nPlayer로 재생"
                style="padding: 6px 10px; font-size: 11px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                📱 N
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// nPlayer로 재생하는 함수
function playWithNPlayer(videoUrl) {

  // 새 창에서 비디오 열기 (iOS/iPadOS 호환)
function openVideoInNewTab(videoUrl) {
  // iOS에서도 작동하도록 직접 URL을 window.open에 전달
  window.open(videoUrl, '_blank', 'noopener,noreferrer');
}


  
  // nPlayer URL 스킴
  const nplayerUrl = `nplayer-${videoUrl}`;
  
  // iOS에서 nPlayer 실행 시도
  window.location.href = nplayerUrl;
  
  // 만약 nPlayer가 설치되지 않았다면 안내 메시지
  setTimeout(() => {
    const install = confirm(
      'nPlayer가 설치되어 있지 않은 것 같습니다.\n\n' +
      'App Store에서 nPlayer를 다운로드하시겠습니까?'
    );
    if (install) {
      window.open('https://apps.apple.com/app/nplayer/id1116905928', '_blank');
    }
  }, 2000);
}


// 영화 상세 모달 표시
function showMovieDetail(movieId) {
  console.log('영화 상세:', movieId);
}

// 영화 옵션 메뉴
async function showMovieOptions(movieId) {
  const movie = await getMovieData(movieId);
  if (!movie) return;
  
  const action = confirm(
    `"${movie.title}" 옵션:\n\n` +
    `[확인] 영상 링크 입력/수정\n` +
    `[취소] 영화 삭제`
  );
  
  if (action) {
    const videoUrl = prompt(
      `"${movie.title}" 영상 링크를 입력하세요:\n` +
      `(현재: ${movie.externalVideoUrl || '없음'})`,
      movie.externalVideoUrl || ''
    );
    
    if (videoUrl !== null) {
      await updateMovieVideoUrl(movieId, videoUrl);
    }
  } else {
    const confirmDelete = confirm(`정말로 "${movie.title}"을(를) 삭제하시겠습니까?`);
    if (confirmDelete) {
      await deleteMovie(movieId);
    }
  }
}

// 영화 데이터 가져오기
async function getMovieData(movieId) {
  try {
    const doc = await db.collection('movies').doc(movieId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('영화 데이터 가져오기 실패:', error);
    return null;
  }
}

// 영상 URL 업데이트
async function updateMovieVideoUrl(movieId, videoUrl) {
  try {
    await db.collection('movies').doc(movieId).update({
      externalVideoUrl: videoUrl
    });
    alert('영상 링크가 업데이트되었습니다!');
    loadMovies();
  } catch (error) {
    console.error('영상 링크 업데이트 실패:', error);
    alert('영상 링크 업데이트에 실패했습니다.');
  }
}

// 영화 삭제
async function deleteMovie(movieId) {
  try {
    await db.collection('movies').doc(movieId).delete();
    alert('영화가 삭제되었습니다.');
    loadMovies();
  } catch (error) {
    console.error('영화 삭제 실패:', error);
    alert('영화 삭제에 실패했습니다.');
  }
}
