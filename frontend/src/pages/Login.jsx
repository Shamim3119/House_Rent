import { useState } from 'react';
import {
    Navigate,
    useNavigate
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';


const Login = () => {

    const navigate = useNavigate();

    const {
        login,
        isAuthenticated
    } = useAuth();


    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);


    // If already logged in, go to dashboard
    if (isAuthenticated) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }


    const handleSubmit = async (event) => {

        event.preventDefault();

        setError('');
        setSubmitting(true);


        try {

            await login(
                username,
                password
            );

            navigate(
                '/dashboard',
                {
                    replace: true
                }
            );

        } catch (error) {

            setError(
                error.response?.data?.message ||
                'Login failed'
            );

        } finally {

            setSubmitting(false);
        }
    };


    return (

        <div>

            <h1>House Rent</h1>

            <h2>Login</h2>


            {error && (
                <div>
                    {error}
                </div>
            )}


            <form onSubmit={handleSubmit}>

                <div>

                    <label>
                        Username
                    </label>

                    <br />

                    <input
                        type="text"
                        value={username}
                        onChange={(event) =>
                            setUsername(event.target.value)
                        }
                        required
                        autoFocus
                    />

                </div>


                <br />


                <div>

                    <label>
                        Password
                    </label>

                    <br />

                    <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        required
                    />

                </div>


                <br />


                <button
                    type="submit"
                    disabled={submitting}
                >

                    {
                        submitting
                            ? 'Signing in...'
                            : 'Login'
                    }

                </button>

            </form>

        </div>
    );
};


export default Login;