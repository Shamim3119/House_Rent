import {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react';

import api from '../api/axios';


const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);


    // =================================================
    // Check authentication when application starts
    // =================================================
    useEffect(() => {

        const loadUser = async () => {

            const token = localStorage.getItem('token');


            // No token means user is not logged in
            if (!token) {
                setLoading(false);
                return;
            }


            try {

                // Verify token and get current user
                const response = await api.get('/auth/me');

                setUser(response.data.user);

            } catch (error) {

                console.error(
                    'Authentication check failed:',
                    error
                );

                // Invalid/expired token
                localStorage.removeItem('token');

                setUser(null);

            } finally {

                setLoading(false);
            }
        };


        loadUser();

    }, []);


    // =================================================
    // Login
    // =================================================
    const login = async (username, password) => {

        const response = await api.post(
            '/auth/login',
            {
                username,
                password
            }
        );


        const {
            token,
            user
        } = response.data;


        localStorage.setItem(
            'token',
            token
        );


        setUser(user);


        return user;
    };


    // =================================================
    // Logout
    // =================================================
    const logout = () => {

        localStorage.removeItem('token');

        setUser(null);
    };


    return (

        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user
            }}
        >

            {children}

        </AuthContext.Provider>
    );
};


// =====================================================
// Custom hook
// =====================================================
export const useAuth = () => {

    return useContext(AuthContext);
};