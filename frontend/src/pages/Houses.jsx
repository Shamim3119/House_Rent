import { useEffect, useState } from 'react';
import {
    Building2,
    Search,
    Plus,
    Pencil,
    Trash2,
    X
} from 'lucide-react';

import api from '../api/axios';


const Houses = () => {

    /* =====================================================
       LIST STATE
    ===================================================== */

    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');


    /* =====================================================
       FORM / MODAL STATE
    ===================================================== */

    const [showModal, setShowModal] = useState(false);

    // null = Add mode
    // object = Edit mode
    const [editingHouse, setEditingHouse] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        address: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');


    /* =====================================================
       DELETE STATE
    ===================================================== */

    const [deletingId, setDeletingId] = useState(null);


    /* =====================================================
       LOAD HOUSES
    ===================================================== */

    const loadHouses = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get('/houses');

            console.log(
                'Houses API response:',
                response.data
            );

            /*
             * Your backend response:
             *
             * {
             *     success: true,
             *     data: [...]
             * }
             */

            const houseData = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setHouses(houseData);

        } catch (err) {

            console.error(
                'Load houses error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load houses.'
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadHouses();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredHouses = houses.filter((house) => {

        const keyword = search
            .trim()
            .toLowerCase();

        return (
            house.name
                ?.toLowerCase()
                .includes(keyword) ||

            house.address
                ?.toLowerCase()
                .includes(keyword)
        );

    });


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    const openAddModal = () => {

        setEditingHouse(null);

        setFormData({
            name: '',
            address: ''
        });

        setFormError('');

        setShowModal(true);

    };


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    const openEditModal = (house) => {

        setEditingHouse(house);

        setFormData({
            name: house.name || '',
            address: house.address || ''
        });

        setFormError('');

        setShowModal(true);

    };


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingHouse(null);
        setFormError('');

    };


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleFormChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));

    };


    /* =====================================================
       SAVE ADD / EDIT
    ===================================================== */

    const handleSaveHouse = async (e) => {

        e.preventDefault();

        setFormError('');


        /* Validation */

        if (!formData.name.trim()) {

            setFormError(
                'House name is required.'
            );

            return;

        }


        const payload = {

            name: formData.name.trim(),

            address:
                formData.address.trim() || null

        };


        try {

            setSaving(true);


            /* =============================================
               EDIT
            ============================================= */

            if (editingHouse) {

                const response = await api.put(
                    `/houses/${editingHouse.id}`,
                    payload
                );

                console.log(
                    'Update house response:',
                    response.data
                );

            }


            /* =============================================
               ADD
            ============================================= */

            else {

                const response = await api.post(
                    '/houses',
                    payload
                );

                console.log(
                    'Create house response:',
                    response.data
                );

            }


            /* Close modal */

            setShowModal(false);

            setEditingHouse(null);

            setFormData({
                name: '',
                address: ''
            });


            /* Reload table */

            await loadHouses();


        } catch (err) {

            console.error(
                'Save house error:',
                err
            );

            setFormError(
                err.response?.data?.message ||
                (
                    editingHouse
                        ? 'Failed to update house.'
                        : 'Failed to create house.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       DELETE HOUSE
    ===================================================== */

    const handleDeleteHouse = async (house) => {

        const confirmed = window.confirm(
            `Are you sure you want to delete "${house.name}"?`
        );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(house.id);
            setError('');


            const response = await api.delete(
                `/houses/${house.id}`
            );

            console.log(
                'Delete house response:',
                response.data
            );


            /* Reload table */

            await loadHouses();


        } catch (err) {

            console.error(
                'Delete house error:',
                err
            );

            alert(
                err.response?.data?.message ||
                'Failed to delete house.'
            );

        } finally {

            setDeletingId(null);

        }

    };


    return (
        <div>

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="page-header">

                <div className="page-title">

                    <h1>Houses</h1>

                    <p>
                        Manage your rental properties
                    </p>

                </div>


                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />

                    Add House
                </button>

            </div>


            {/* =================================================
                HOUSE LIST
            ================================================= */}

            <div className="card">

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search houses..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                <div className="card-body">

                    {/* Loading */}

                    {loading && (

                        <div className="empty-state">

                            <p>
                                Loading houses...
                            </p>

                        </div>

                    )}


                    {/* Error */}

                    {!loading && error && (

                        <div className="error-message">

                            {error}

                        </div>

                    )}


                    {/* Empty */}

                    {!loading &&
                        !error &&
                        filteredHouses.length === 0 && (

                            <div className="empty-state">

                                <Building2 size={40} />

                                <h3>
                                    No houses found
                                </h3>

                                <p>
                                    No house records are available.
                                </p>

                            </div>

                        )}


                    {/* Table */}

                    {!loading &&
                        !error &&
                        filteredHouses.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>

                                            <th>ID</th>

                                            <th>
                                                House Name
                                            </th>

                                            <th>
                                                Address
                                            </th>

                                            <th className="actions-column">
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredHouses.map(
                                            (house) => (

                                                <tr key={house.id}>

                                                    <td>
                                                        {house.id}
                                                    </td>


                                                    <td>

                                                        <div className="house-name-cell">

                                                            <div className="house-icon">

                                                                <Building2
                                                                    size={16}
                                                                />

                                                            </div>

                                                            <span>
                                                                {house.name}
                                                            </span>

                                                        </div>

                                                    </td>


                                                    <td>

                                                        {house.address || '-'}

                                                    </td>


                                                    {/* ACTIONS */}

                                                    <td>

                                                        <div className="table-actions">

                                                            {/* Edit */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-edit"
                                                                onClick={() =>
                                                                    openEditModal(house)
                                                                }
                                                                title="Edit House"
                                                                aria-label="Edit House"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>


                                                            {/* Delete */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-delete"
                                                                onClick={() =>
                                                                    handleDeleteHouse(house)
                                                                }
                                                                disabled={
                                                                    deletingId === house.id
                                                                }
                                                                title="Delete House"
                                                                aria-label="Delete House"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        )}

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <div
                    className="modal-backdrop"
                    onMouseDown={closeModal}
                >

                    <div
                        className="modal-box"
                        onMouseDown={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* Header */}

                        <div className="modal-header">

                            <div>

                                <h2>

                                    {editingHouse
                                        ? 'Edit House'
                                        : 'Add House'
                                    }

                                </h2>


                                <p>

                                    {editingHouse
                                        ? 'Update rental property information'
                                        : 'Create a new rental property'
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>

                        </div>


                        {/* Form */}

                        <form
                            onSubmit={handleSaveHouse}
                        >

                            <div className="modal-body">


                                {/* Error */}

                                {formError && (

                                    <div className="error-message modal-error">

                                        {formError}

                                    </div>

                                )}


                                {/* Name */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="house-name"
                                    >
                                        House Name

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <input
                                        id="house-name"
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        placeholder="Enter house name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        autoFocus
                                        disabled={saving}
                                    />

                                </div>


                                {/* Address */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="house-address"
                                    >
                                        Address
                                    </label>


                                    <textarea
                                        id="house-address"
                                        name="address"
                                        className="form-control form-textarea"
                                        placeholder="Enter house address"
                                        value={formData.address}
                                        onChange={handleFormChange}
                                        rows="4"
                                        disabled={saving}
                                    />

                                </div>

                            </div>


                            {/* Footer */}

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >

                                    {editingHouse
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }


                                    {saving
                                        ? 'Saving...'
                                        : editingHouse
                                            ? 'Update House'
                                            : 'Save House'
                                    }

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );

};


export default Houses;