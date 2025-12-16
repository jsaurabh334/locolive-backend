import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

const UserItem = ({ user, action, onAction, secondaryAction, onSecondaryAction }) => {
    const navigate = useNavigate();

    return (
        <div
            className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl mb-3 cursor-pointer hover:bg-gray-800/80 transition-colors"
            onClick={() => navigate(`/profile/${user.id}`)}
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-white">{user.full_name || user.username}</h3>
                    <p className="text-sm text-gray-400">@{user.username}</p>
                </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {action && (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onAction(user)}
                    >
                        {action}
                    </Button>
                )}
                {secondaryAction && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSecondaryAction(user)}
                    >
                        {secondaryAction}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default UserItem;
