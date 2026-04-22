// Development localhost ports (teacher: 8081, student: 8085)
const DEV_LOCALHOST_PORTS = ['3000', '3001', '8081', '8085', '8095'];

const TRUSTED_ORIGINS = [
    // Development - localhost
    ...DEV_LOCALHOST_PORTS.map(port => `http://localhost:${port}`),
    ...DEV_LOCALHOST_PORTS.map(port => `http://127.0.0.1:${port}`),
    // Development - remote
    'https://teacher.dev.noonedu.io',
    'https://student.dev.noonedu.io',
    'https://student.school.dev.noonedu.io',
    'https://ai.dev.noonedu.io',
    'https://nolt.dev.noonedu.io',
    // Staging
    'https://teacher.staging.noonedu.io',
    'https://student.staging.noonedu.io',
    'https://student.school.staging.noonedu.io', 
    'https://ai.staging.noonedu.io',
    // Production
    'https://teacher.noonacademy.com',
    'https://student.noonacademy.com',
    'https://teacher.noon.edu.sa',
    'https://student.noon.edu.sa',
    'https://ai.noon.edu.sa',
];

export const embeddedAuthService = {
    initiateHandshake() {
        return new Promise((resolve, reject) => {
            let timeoutId;

            const handleMessage = (event) => {
                try {
                    // Only allow explicitly trusted origins (includes specific localhost ports)
                    if (event.origin && !TRUSTED_ORIGINS.includes(event.origin)) {
                        return;
                    }

                    let data = event.data;
                    if (typeof data === 'string') {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            return;
                        }
                    }

                    if (data && data.accessToken) {
                        clearTimeout(timeoutId);
                        window.removeEventListener('message', handleMessage);
                        resolve(data);
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', handleMessage);
                    reject(error);
                }
            };

            timeoutId = setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error('Authentication handshake timeout'));
            }, 10000);

            window.addEventListener('message', handleMessage);

            const isIframe = window.self !== window.top;
            const isWebView = window.ReactNativeWebView !== undefined;

            if (isWebView) {
                window.ReactNativeWebView.postMessage('HANDSHAKE_START_RN');
            } else if (isIframe) {
                // Send to parent's origin. We can't know it ahead of time
                // so we use '*', but the response is validated via TRUSTED_ORIGINS.
                // In production the parent origin should be pinned.
                window.parent.postMessage('HANDSHAKE_START', '*');
            } else {
                clearTimeout(timeoutId);
                window.removeEventListener('message', handleMessage);
            
                // In standalone dev mode, use token from env or generate a mock.
                // To test with a real token: set VITE_DEV_ACCESS_TOKEN in .env.local
                const devToken = import.meta.env.VITE_DEV_ACCESS_TOKEN || 'dev-mock-token';
                setTimeout(() => {
                        resolve({
                            accessToken: devToken,
                            refreshToken: 'refresh-token',
                            validUntil: Date.now() + (10 * 60 * 1000), // 10 minutes
                            sessionDetails: {
                                sessionId: 'dev-session',
                                sessionSlideId: import.meta.env.VITE_DEV_SESSION_SLIDE_ID || null,
                                roomId: 456,
                                classroomId: 123,
                                physicalClassroomId: 123,
                                classroomName: 'Development Classroom'
                            }
                        });
                }, 500);
            }
        });
    },
};

export default embeddedAuthService;
