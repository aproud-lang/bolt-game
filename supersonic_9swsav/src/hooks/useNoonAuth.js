import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { embeddedAuthService } from '../services/embeddedAuth';
import { sessionContextService } from '../services/sessionContext';
import { teamService } from '../services/teamService';

const resolveSessionId = (details) => {
    if (!details) {
        return null;
    }
    return details.sessionId ??
        details.courseSessionId ??
        details.session_id ??
        details.course_session_id ??
        null;
};

const coerceSessionId = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
};

const extractNumericSessionId = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeSessionDetails = (details = {}) => {
    const safeDetails = details ?? {};
    const sessionId = coerceSessionId(resolveSessionId(safeDetails));
    const roomId = safeDetails?.roomId ?? safeDetails?.room_id ?? safeDetails?.roomID ?? null;
    const physicalClassroomId = safeDetails?.physicalClassroomId ??
        safeDetails?.physical_classroom_id ??
        safeDetails?.classroomId ??
        safeDetails?.classroom_id ??
        null;

    return {
        ...safeDetails,
        sessionId,
        roomId,
        classroomId: physicalClassroomId ?? null,
        physicalClassroomId: physicalClassroomId ?? null,
    };
};

const mergeSessionContext = (sessionDetails, context) => {
    if (!context) {
        return sessionDetails;
    }

    const courseSession = context?.courseSession;
    const roomId = courseSession?.room?.roomId ?? sessionDetails?.roomId ?? null;
    const physicalClassroomId = courseSession?.physicalClassroom?.id ??
        courseSession?.room?.physicalClassroomId ??
        sessionDetails?.physicalClassroomId ??
        null;

    return {
        ...sessionDetails,
        sessionId: courseSession?.courseSessionId ?? sessionDetails?.sessionId,
        courseId: courseSession?.courseId ?? sessionDetails?.courseId,
        courseSessionName: courseSession?.courseSessionName ?? sessionDetails?.courseSessionName,
        roomId,
        classroomId: physicalClassroomId,
        physicalClassroomId,
        server: context?.server ?? sessionDetails?.server,
    };
};

const getAppType = (userType) => {
    return userType === 'TEACHER' ? 'TEACHER' : userType === 'ADMIN' ? 'ADMIN' : 'STUDENT';
};

/**
 * Hook to handle authentication with the noon2 platform.
 * 
 * @returns {Object} Auth state
 * @property {Object|null} user - User information (if available)
 * @property {Object|null} token - The auth tokens { accessToken, refreshToken, validUntil }
 * @property {string} status - Current status: 'initializing', 'authenticated', 'error'
 * @property {Error|null} error - Error object if auth failed
 * @property {Object|null} team - Team information if available { teamId: string, avatar: { key: string, name: string, url: string } }
 */
export const useNoonAuth = () => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [status, setStatus] = useState('initializing');
    const [error, setError] = useState(null);
    const [defaultHeaders, setDefaultHeaders] = useState({});
    const [team, setTeam] = useState(null);

    useEffect(() => {
        let mounted = true;
        let expiresInTimeout = null;

        const initAuth = async () => {
            try {
                const data = await embeddedAuthService.initiateHandshake();

                if (mounted) {
                    setToken({
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken
                    });

                    const decodedTokens = jwtDecode(data.accessToken);
                    const profileData = decodedTokens?.attributes?.profiles?.[0];

                    if (profileData) {
                        setUser(profileData);
                    }

                    const defaultHeaders = {
                        'app-type': getAppType(profileData?.userType),
                        'Content-Type': 'application/json',
                        'app-version': '1.0.0',
                        'platform': 'WEB',
                        'locale': profileData?.locale ?? 'ar',
                        'country-code': profileData?.country?.isoCode2 ?? 'SA',
                        'device-id': decodedTokens?.userIdentifier
                    };
                    setDefaultHeaders(defaultHeaders);

                    // Set a timeout to refresh the token 2 minutes before it expires
                    const refreshTokenTimeout = ((decodedTokens.exp * 1000) - Date.now() - (2 * 60 * 1000));
                    console.log('refreshTokenTimeout', refreshTokenTimeout);
                    expiresInTimeout = setTimeout(async () => {
                        // Refresh the token
                        console.log('refreshing token');
                        const newToken = await authService.refreshToken(data.refreshToken, defaultHeaders);
                        console.log('[useNoonAuth] Token refreshed');
                        setToken({
                            accessToken: newToken.accessToken,
                            refreshToken: newToken.refreshToken,
                            validUntil: newToken.validUntil
                        });
                    }, refreshTokenTimeout);

                    let resolvedSessionDetails = normalizeSessionDetails(data.sessionDetails);
                    const numericSessionId = extractNumericSessionId(resolvedSessionDetails?.sessionId);

                    if (numericSessionId) {
                        try {
                            const contextResult = await sessionContextService.fetchSessionContext(
                                numericSessionId,
                                data.accessToken,
                                defaultHeaders
                            );
                            resolvedSessionDetails = mergeSessionContext(resolvedSessionDetails, contextResult);

                            const routingKey = contextResult?.server ?? null;
                            const teamResult = await teamService.fetchTeam(
                                resolvedSessionDetails?.roomId,
                                profileData?.id,
                                data.accessToken,
                                defaultHeaders,
                                routingKey
                            );
                            console.log('teamResult', teamResult);
                            setTeam(teamResult?.team ?? null);
                        } catch (contextError) {
                            console.warn('[useNoonAuth] Error fetching session context or team:', contextError);
                        }
                    }

                    setSessionDetails(resolvedSessionDetails);
                    setStatus('authenticated');
                }
            } catch (err) {
                if (mounted) {
                    console.error('Noon Auth Error:', err);
                    setError(err);
                    setStatus('error');
                }
            }
        };

        initAuth();

        return () => {
            if (expiresInTimeout) {
                clearTimeout(expiresInTimeout);
                expiresInTimeout = null;
            }
            mounted = false;
        };
    }, []);

    return { token, user, sessionDetails, status, defaultHeaders, error, team };
};

export default useNoonAuth;
