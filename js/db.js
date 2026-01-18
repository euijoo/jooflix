// Firestore 데이터베이스 작업
const db = {
    // 영화 추가
    async addMovie(movieData) {
        try {
            const moviesRef = firebase.firestore().collection('movies');
            const movieRef = await moviesRef.add({
                ...movieData,
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('영화 추가 성공:', movieRef.id);
            return movieRef.id;
        } catch (error) {
            console.error('영화 추가 오류:', error);
            throw error;
        }
    },

    // 영화 목록 가져오기
    async getMovies() {
        try {
            const moviesRef = firebase.firestore().collection('movies');
            const snapshot = await moviesRef
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            const movies = [];
            snapshot.forEach(doc => {
                movies.push({
                    firebaseId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('영화 목록 불러오기 성공:', movies.length);
            return movies;
        } catch (error) {
            console.error('영화 목록 불러오기 오류:', error);
            throw error;
        }
    },

    // 영화 삭제
    async deleteMovie(movieId) {
        try {
            await firebase.firestore().collection('movies').doc(movieId).delete();
            console.log('영화 삭제 성공:', movieId);
        } catch (error) {
            console.error('영화 삭제 오류:', error);
            throw error;
        }
    }
};
