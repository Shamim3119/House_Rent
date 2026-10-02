import { useEffect, useState } from 'react';

import {
    DoorOpen,
    Search,
    Plus,
    Pencil,
    Trash2,
    X
} from 'lucide-react';

import api from '../api/axios';


const PropertyUnits = () => {

    /* =====================================================
       LIST STATE
    ===================================================== */

    const [propertyUnits, setPropertyUnits] = useState([]);
    const [houses, setHouses] = useState([]);
    const [propertyTypes, setPropertyTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');


    /* =====================================================
       MODAL / FORM STATE
    ===================================================== */

    const [showModal, setShowModal] = useState(false);

    const [editingPropertyUnit, setEditingPropertyUnit] =
        useState(null);

    const [formData, setFormData] = useState({
        name: '',
        house_id: '',
        property_type_id: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');


    /* =====================================================
       DELETE STATE
    ===================================================== */

    const [deletingId, setDeletingId] = useState(null);


    /* =====================================================
       LOAD PROPERTY UNITS
    ===================================================== */

    const loadPropertyUnits = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get(
                '/property-units'
            );

            console.log(
                'Property Units API response:',
                response.data
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setPropertyUnits(data);

        } catch (err) {

            console.error(
                'Load property units error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load property units.'
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       LOAD HOUSES
    ===================================================== */

    const loadHouses = async () => {

        try {

            const response = await api.get('/houses');

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setHouses(data);

        } catch (err) {

            console.error(
                'Load houses error:',
                err
            );

        }

    };


    /* =====================================================
       LOAD PROPERTY TYPES
    ===================================================== */

    const loadPropertyTypes = async () => {

        try {

            const response = await api.get(
                '/property-types'
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setPropertyTypes(data);

        } catch (err) {

            console.error(
                'Load property types error:',
                err
            );

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadPropertyUnits();
        loadHouses();
        loadPropertyTypes();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredPropertyUnits =
        propertyUnits.filter((unit) => {

            const keyword = search
                .trim()
                .toLowerCase();

            return (

                unit.name
                    ?.toLowerCase()
                    .includes(keyword) ||

                unit.house_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                unit.property_type_name
                    ?.toLowerCase()
                    .includes(keyword)

            );

        });


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    const openAddModal = () => {

        setEditingPropertyUnit(null);

        setFormData({
            name: '',
            house_id: '',
            property_type_id: ''
        });

        setFormError('');

        setShowModal(true);

    };


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    const openEditModal = (unit) => {

        console.log(
            'Editing property unit:',
            unit
        );

        setEditingPropertyUnit(unit);

        setFormData({
            name: unit.name || '',

            house_id:
                unit.house_id
                    ? String(unit.house_id)
                    : '',

            property_type_id:
                unit.property_type_id
                    ? String(unit.property_type_id)
                    : ''
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
        setEditingPropertyUnit(null);
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
       SAVE PROPERTY UNIT
    ===================================================== */

    const handleSavePropertyUnit = async (e) => {

        e.preventDefault();

        setFormError('');


        /* -------------------------------------------------
           VALIDATION
        ------------------------------------------------- */

        if (!formData.name.trim()) {

            setFormError(
                'Property unit name is required.'
            );

            return;

        }


        if (!formData.house_id) {

            setFormError(
                'Please select a house.'
            );

            return;

        }


        if (!formData.property_type_id) {

            setFormError(
                'Please select a property type.'
            );

            return;

        }


        /* -------------------------------------------------
           PAYLOAD
        ------------------------------------------------- */

        const payload = {

            name: formData.name.trim(),

            house_id:
                Number(formData.house_id),

            property_type_id:
                Number(formData.property_type_id)

        };


        console.log(
            'Property Unit payload:',
            payload
        );


        try {

            setSaving(true);


            /* =============================================
               EDIT
            ============================================= */

            if (editingPropertyUnit) {

                const response = await api.put(
                    `/property-units/${editingPropertyUnit.id}`,
                    payload
                );

                console.log(
                    'Update property unit response:',
                    response.data
                );

            }


            /* =============================================
               ADD
            ============================================= */

            else {

                const response = await api.post(
                    '/property-units',
                    payload
                );

                console.log(
                    'Create property unit response:',
                    response.data
                );

            }


            setShowModal(false);

            setEditingPropertyUnit(null);

            setFormData({
                name: '',
                house_id: '',
                property_type_id: ''
            });


            await loadPropertyUnits();


        } catch (err) {

            console.error(
                'Save property unit error:',
                err
            );

            setFormError(
                err.response?.data?.message ||
                (
                    editingPropertyUnit
                        ? 'Failed to update property unit.'
                        : 'Failed to create property unit.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       DELETE PROPERTY UNIT
    ===================================================== */

    const handleDeletePropertyUnit = async (unit) => {

        const confirmed = window.confirm(
            `Are you sure you want to delete "${unit.name}"?`
        );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(unit.id);
            setError('');


            const response = await api.delete(
                `/property-units/${unit.id}`
            );

            console.log(
                'Delete property unit response:',
                response.data
            );


            await loadPropertyUnits();


        } catch (err) {

            console.error(
                'Delete property unit error:',
                err
            );


            alert(
                err.response?.data?.message ||
                'Failed to delete property unit.'
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
                        Property Units
                    </h1>

                    <p>
                        Manage flats, shops, garages and other rental units
                    </p>

                </div>


                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />

                    Add Property Unit
                </button>

            </div>


            {/* =================================================
                PROPERTY UNIT LIST
            ================================================= */}

            <div className="card">

                {/* Toolbar */}

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search property units..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                <div className="card-body">

                    {/* =========================================
                        LOADING
                    ========================================= */}

                    {loading && (

                        <div className="empty-state">

                            <p>
                                Loading property units...
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
                        filteredPropertyUnits.length === 0 && (

                            <div className="empty-state">

                                <DoorOpen size={40} />

                                <h3>
                                    No property units found
                                </h3>

                                <p>
                                    No property unit records are available.
                                </p>

                            </div>

                        )}


                    {/* =========================================
                        TABLE
                    ========================================= */}

                    {!loading &&
                        !error &&
                        filteredPropertyUnits.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                ID
                                            </th>

                                            <th>
                                                Unit Name
                                            </th>

                                            <th>
                                                House
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

                                        {filteredPropertyUnits.map(
                                            (unit) => (

                                                <tr key={unit.id}>

                                                    {/* ID */}

                                                    <td>
                                                        {unit.id}
                                                    </td>


                                                    {/* UNIT */}

                                                    <td>

                                                        <div className="house-name-cell">

                                                            <div className="house-icon">

                                                                <DoorOpen
                                                                    size={16}
                                                                />

                                                            </div>

                                                            <span>
                                                                {unit.name}
                                                            </span>

                                                        </div>

                                                    </td>


                                                    {/* HOUSE */}

                                                    <td>

                                                        {unit.house_name || '-'}

                                                    </td>


                                                    {/* TYPE */}

                                                    <td>

                                                        {unit.property_type_name || '-'}

                                                    </td>


                                                    {/* ACTIONS */}

                                                    <td>

                                                        <div className="table-actions">

                                                            {/* EDIT */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-edit"
                                                                onClick={() =>
                                                                    openEditModal(unit)
                                                                }
                                                                title="Edit Property Unit"
                                                                aria-label="Edit Property Unit"
                                                            >
                                                                <Pencil
                                                                    size={15}
                                                                />
                                                            </button>


                                                            {/* DELETE */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-delete"
                                                                onClick={() =>
                                                                    handleDeletePropertyUnit(unit)
                                                                }
                                                                disabled={
                                                                    deletingId === unit.id
                                                                }
                                                                title="Delete Property Unit"
                                                                aria-label="Delete Property Unit"
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

                                    {editingPropertyUnit
                                        ? 'Edit Property Unit'
                                        : 'Add Property Unit'
                                    }

                                </h2>


                                <p>

                                    {editingPropertyUnit
                                        ? 'Update property unit information'
                                        : 'Create a new rental property unit'
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
                                handleSavePropertyUnit
                            }
                        >

                            <div className="modal-body">


                                {/* ERROR */}

                                {formError && (

                                    <div className="error-message modal-error">

                                        {formError}

                                    </div>

                                )}


                                {/* =================================
                                    UNIT NAME
                                ================================= */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="unit-name"
                                    >

                                        Unit Name

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <input
                                        id="unit-name"
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        placeholder="Example: Flat A1, Shop 02"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        autoFocus
                                        disabled={saving}
                                    />

                                </div>


                                {/* =================================
                                    HOUSE
                                ================================= */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="house-id"
                                    >

                                        House

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        id="house-id"
                                        name="house_id"
                                        className="form-control"
                                        value={formData.house_id}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    >

                                        <option value="">
                                            Select House
                                        </option>


                                        {houses.map((house) => (

                                            <option
                                                key={house.id}
                                                value={house.id}
                                            >
                                                {house.name}
                                            </option>

                                        ))}

                                    </select>

                                </div>


                                {/* =================================
                                    PROPERTY TYPE
                                ================================= */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="property-type-id"
                                    >

                                        Property Type

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        id="property-type-id"
                                        name="property_type_id"
                                        className="form-control"
                                        value={formData.property_type_id}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    >

                                        <option value="">
                                            Select Property Type
                                        </option>


                                        {propertyTypes.map(
                                            (propertyType) => (

                                                <option
                                                    key={propertyType.id}
                                                    value={propertyType.id}
                                                >
                                                    {propertyType.name}
                                                </option>

                                            )
                                        )}

                                    </select>

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

                                    {editingPropertyUnit
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }


                                    {saving
                                        ? 'Saving...'
                                        : editingPropertyUnit
                                            ? 'Update Property Unit'
                                            : 'Save Property Unit'
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


export default PropertyUnits;