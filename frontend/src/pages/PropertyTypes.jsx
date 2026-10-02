import { useEffect, useState } from 'react';

import {
    Shapes,
    Search,
    Plus,
    Pencil,
    Trash2,
    X
} from 'lucide-react';

import api from '../api/axios';


const PropertyTypes = () => {

    /* =====================================================
       LIST STATE
    ===================================================== */

    const [propertyTypes, setPropertyTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');


    /* =====================================================
       FORM / MODAL STATE
    ===================================================== */

    const [showModal, setShowModal] = useState(false);

    /*
     * null   = Add mode
     * object = Edit mode
     */
    const [editingPropertyType, setEditingPropertyType] =
        useState(null);

    const [formData, setFormData] = useState({
        name: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');


    /* =====================================================
       DELETE STATE
    ===================================================== */

    const [deletingId, setDeletingId] = useState(null);


    /* =====================================================
       LOAD PROPERTY TYPES
    ===================================================== */

    const loadPropertyTypes = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get(
                '/property-types'
            );

            console.log(
                'Property Types API response:',
                response.data
            );


            /*
             * Expected backend response:
             *
             * {
             *     success: true,
             *     data: [...]
             * }
             */

            const propertyTypeData =
                Array.isArray(response.data.data)
                    ? response.data.data
                    : [];


            setPropertyTypes(propertyTypeData);

        } catch (err) {

            console.error(
                'Load property types error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load property types.'
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadPropertyTypes();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredPropertyTypes =
        propertyTypes.filter((propertyType) => {

            const keyword = search
                .trim()
                .toLowerCase();

            return propertyType.name
                ?.toLowerCase()
                .includes(keyword);

        });


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    const openAddModal = () => {

        setEditingPropertyType(null);

        setFormData({
            name: ''
        });

        setFormError('');

        setShowModal(true);

    };


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    const openEditModal = (propertyType) => {

        setEditingPropertyType(propertyType);

        setFormData({
            name: propertyType.name || ''
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

        setEditingPropertyType(null);

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
       SAVE PROPERTY TYPE
       ADD + EDIT
    ===================================================== */

    const handleSavePropertyType = async (e) => {

        e.preventDefault();

        setFormError('');


        /* ---------------------------------------------
           Validation
        --------------------------------------------- */

        if (!formData.name.trim()) {

            setFormError(
                'Property type name is required.'
            );

            return;

        }


        const payload = {
            name: formData.name.trim()
        };


        try {

            setSaving(true);


            /* =========================================
               EDIT
            ========================================= */

            if (editingPropertyType) {

                const response = await api.put(
                    `/property-types/${editingPropertyType.id}`,
                    payload
                );

                console.log(
                    'Update property type response:',
                    response.data
                );

            }


            /* =========================================
               ADD
            ========================================= */

            else {

                const response = await api.post(
                    '/property-types',
                    payload
                );

                console.log(
                    'Create property type response:',
                    response.data
                );

            }


            /* -----------------------------------------
               Close modal
            ----------------------------------------- */

            setShowModal(false);

            setEditingPropertyType(null);


            /* -----------------------------------------
               Clear form
            ----------------------------------------- */

            setFormData({
                name: ''
            });


            /* -----------------------------------------
               Reload grid
            ----------------------------------------- */

            await loadPropertyTypes();


        } catch (err) {

            console.error(
                'Save property type error:',
                err
            );

            setFormError(
                err.response?.data?.message ||
                (
                    editingPropertyType
                        ? 'Failed to update property type.'
                        : 'Failed to create property type.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       DELETE PROPERTY TYPE
    ===================================================== */

    const handleDeletePropertyType =
        async (propertyType) => {

            const confirmed = window.confirm(
                `Are you sure you want to delete "${propertyType.name}"?`
            );


            if (!confirmed) {
                return;
            }


            try {

                setDeletingId(propertyType.id);

                setError('');


                const response = await api.delete(
                    `/property-types/${propertyType.id}`
                );


                console.log(
                    'Delete property type response:',
                    response.data
                );


                /* Reload grid */

                await loadPropertyTypes();


            } catch (err) {

                console.error(
                    'Delete property type error:',
                    err
                );


                alert(
                    err.response?.data?.message ||
                    'Failed to delete property type.'
                );


            } finally {

                setDeletingId(null);

            }

        };


    /* =====================================================
       PAGE
    ===================================================== */

    return (
        <div>

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="page-header">

                <div className="page-title">

                    <h1>
                        Property Types
                    </h1>

                    <p>
                        Manage property and unit types
                    </p>

                </div>


                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />

                    Add Property Type
                </button>

            </div>


            {/* =================================================
                PROPERTY TYPE LIST
            ================================================= */}

            <div className="card">

                {/* Toolbar */}

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search property types..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                {/* Body */}

                <div className="card-body">


                    {/* =========================================
                        LOADING
                    ========================================= */}

                    {loading && (

                        <div className="empty-state">

                            <p>
                                Loading property types...
                            </p>

                        </div>

                    )}


                    {/* =========================================
                        ERROR
                    ========================================= */}

                    {!loading && error && (

                        <div className="error-message">

                            {error}

                        </div>

                    )}


                    {/* =========================================
                        EMPTY
                    ========================================= */}

                    {!loading &&
                        !error &&
                        filteredPropertyTypes.length === 0 && (

                            <div className="empty-state">

                                <Shapes size={40} />

                                <h3>
                                    No property types found
                                </h3>

                                <p>
                                    No property type records are available.
                                </p>

                            </div>

                        )}


                    {/* =========================================
                        TABLE
                    ========================================= */}

                    {!loading &&
                        !error &&
                        filteredPropertyTypes.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                ID
                                            </th>

                                            <th>
                                                Property Type
                                            </th>

                                            <th className="actions-column">
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredPropertyTypes.map(
                                            (propertyType) => (

                                                <tr
                                                    key={propertyType.id}
                                                >

                                                    {/* ID */}

                                                    <td>
                                                        {propertyType.id}
                                                    </td>


                                                    {/* Name */}

                                                    <td>

                                                        <div className="house-name-cell">

                                                            <div className="house-icon">

                                                                <Shapes
                                                                    size={16}
                                                                />

                                                            </div>

                                                            <span>
                                                                {propertyType.name}
                                                            </span>

                                                        </div>

                                                    </td>


                                                    {/* Actions */}

                                                    <td>

                                                        <div className="table-actions">


                                                            {/* Edit */}

                                                            <button
                                                                type="button"
                                                                className="
                                                                    action-button
                                                                    action-edit
                                                                "
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        propertyType
                                                                    )
                                                                }
                                                                title="Edit Property Type"
                                                                aria-label="Edit Property Type"
                                                            >
                                                                <Pencil
                                                                    size={15}
                                                                />
                                                            </button>


                                                            {/* Delete */}

                                                            <button
                                                                type="button"
                                                                className="
                                                                    action-button
                                                                    action-delete
                                                                "
                                                                onClick={() =>
                                                                    handleDeletePropertyType(
                                                                        propertyType
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingId ===
                                                                    propertyType.id
                                                                }
                                                                title="Delete Property Type"
                                                                aria-label="Delete Property Type"
                                                            >
                                                                <Trash2
                                                                    size={15}
                                                                />
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

                        {/* =====================================
                            MODAL HEADER
                        ===================================== */}

                        <div className="modal-header">

                            <div>

                                <h2>

                                    {editingPropertyType
                                        ? 'Edit Property Type'
                                        : 'Add Property Type'
                                    }

                                </h2>


                                <p>

                                    {editingPropertyType
                                        ? 'Update property type information'
                                        : 'Create a new property type'
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


                        {/* =====================================
                            FORM
                        ===================================== */}

                        <form
                            onSubmit={
                                handleSavePropertyType
                            }
                        >

                            <div className="modal-body">


                                {/* Error */}

                                {formError && (

                                    <div className="
                                        error-message
                                        modal-error
                                    ">

                                        {formError}

                                    </div>

                                )}


                                {/* Property Type Name */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="property-type-name"
                                    >

                                        Property Type Name

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <input
                                        id="property-type-name"
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        placeholder="Example: Flat, Shop, Garage"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        autoFocus
                                        disabled={saving}
                                    />

                                </div>

                            </div>


                            {/* =================================
                                MODAL FOOTER
                            ================================= */}

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

                                    {editingPropertyType
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }


                                    {saving
                                        ? 'Saving...'
                                        : editingPropertyType
                                            ? 'Update Property Type'
                                            : 'Save Property Type'
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


export default PropertyTypes;