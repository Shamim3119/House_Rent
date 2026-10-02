import { useEffect, useState } from 'react';
import {
    KeyRound,
    Search,
    Plus,
    Pencil,
    Trash2,
    X,
    LogOut
} from 'lucide-react';

import api from '../api/axios';


const Tenancies = () => {

    const [tenancies, setTenancies] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [propertyUnits, setPropertyUnits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingTenancy, setEditingTenancy] = useState(null);

    const [formData, setFormData] = useState({
        tenant_id: '',
        property_unit_id: '',
        start_date: '',
        end_date: '',
        advance_amount: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [endingId, setEndingId] = useState(null);


    /* =====================================================
       DATE FORMAT
    ===================================================== */

    const formatDateForInput = (dateValue) => {

        if (!dateValue) {
            return '';
        }

        return String(dateValue).substring(0, 10);

    };


    const formatDateForDisplay = (dateValue) => {

        if (!dateValue) {
            return '-';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString();

    };


    /* =====================================================
       LOAD TENANCIES
    ===================================================== */

    const loadTenancies = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get('/tenancies');

            console.log(
                'Tenancies API response:',
                response.data
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setTenancies(data);

        } catch (err) {

            console.error(
                'Load tenancies error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load tenancies.'
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       LOAD TENANTS
    ===================================================== */

    const loadTenants = async () => {

        try {

            const response = await api.get('/tenants');

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setTenants(data);

        } catch (err) {

            console.error(
                'Load tenants error:',
                err
            );

        }

    };


    /* =====================================================
       LOAD PROPERTY UNITS
    ===================================================== */

    const loadPropertyUnits = async () => {

        try {

            const response = await api.get(
                '/property-units'
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

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadTenancies();
        loadTenants();
        loadPropertyUnits();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredTenancies = tenancies.filter(
        (tenancy) => {

            const keyword = search
                .trim()
                .toLowerCase();

            return (
                tenancy.tenant_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                tenancy.property_unit_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                tenancy.house_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                tenancy.status
                    ?.toLowerCase()
                    .includes(keyword)
            );

        }
    );


    /* =====================================================
       OPEN ADD
    ===================================================== */

    const openAddModal = () => {

        setEditingTenancy(null);

        setFormData({
            tenant_id: '',
            property_unit_id: '',
            start_date: '',
            end_date: '',
            advance_amount: ''
        });

        setFormError('');
        setShowModal(true);

    };


    /* =====================================================
       OPEN EDIT
    ===================================================== */

    const openEditModal = (tenancy) => {

        setEditingTenancy(tenancy);

        setFormData({

            tenant_id:
                tenancy.tenant_id
                    ? String(tenancy.tenant_id)
                    : '',

            property_unit_id:
                tenancy.property_unit_id
                    ? String(tenancy.property_unit_id)
                    : '',

            start_date:
                formatDateForInput(
                    tenancy.start_date
                ),

            end_date:
                formatDateForInput(
                    tenancy.end_date
                ),

            advance_amount:
                tenancy.advance_amount ?? ''

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
        setEditingTenancy(null);
        setFormError('');

    };


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleFormChange = (e) => {

        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    /* =====================================================
       SAVE
    ===================================================== */

    const handleSaveTenancy = async (e) => {

        e.preventDefault();

        setFormError('');


        if (!formData.tenant_id) {

            setFormError(
                'Please select a tenant.'
            );

            return;

        }


        if (!formData.property_unit_id) {

            setFormError(
                'Please select a property unit.'
            );

            return;

        }


        if (!formData.start_date) {

            setFormError(
                'Start date is required.'
            );

            return;

        }


        if (
            formData.end_date &&
            formData.end_date < formData.start_date
        ) {

            setFormError(
                'End date cannot be before start date.'
            );

            return;

        }


        const advanceAmount =
            formData.advance_amount === ''
                ? 0
                : Number(formData.advance_amount);


        if (
            Number.isNaN(advanceAmount) ||
            advanceAmount < 0
        ) {

            setFormError(
                'Advance amount must be zero or greater.'
            );

            return;

        }


        const payload = {

            tenant_id:
                Number(formData.tenant_id),

            property_unit_id:
                Number(formData.property_unit_id),

            start_date:
                formData.start_date,

            end_date:
                formData.end_date || null,

            advance_amount:
                advanceAmount

        };


        console.log(
            'Tenancy payload:',
            payload
        );


        try {

            setSaving(true);


            if (editingTenancy) {

                const response = await api.put(
                    `/tenancies/${editingTenancy.id}`,
                    payload
                );

                console.log(
                    'Update tenancy response:',
                    response.data
                );

            } else {

                const response = await api.post(
                    '/tenancies',
                    payload
                );

                console.log(
                    'Create tenancy response:',
                    response.data
                );

            }


            setShowModal(false);
            setEditingTenancy(null);

            await loadTenancies();

        } catch (err) {

            console.error(
                'Save tenancy error:',
                err
            );

            setFormError(
                err.response?.data?.message ||
                (
                    editingTenancy
                        ? 'Failed to update tenancy.'
                        : 'Failed to create tenancy.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       END TENANCY
    ===================================================== */

    const handleEndTenancy = async (tenancy) => {

        const confirmed = window.confirm(
            `End tenancy for "${tenancy.tenant_name}"?`
        );

        if (!confirmed) {
            return;
        }


        try {

            setEndingId(tenancy.id);

            const response = await api.put(
                `/tenancies/${tenancy.id}/end`
            );

            console.log(
                'End tenancy response:',
                response.data
            );

            await loadTenancies();

        } catch (err) {

            console.error(
                'End tenancy error:',
                err
            );

            alert(
                err.response?.data?.message ||
                'Failed to end tenancy.'
            );

        } finally {

            setEndingId(null);

        }

    };


    /* =====================================================
       DELETE
    ===================================================== */

    const handleDeleteTenancy = async (tenancy) => {

        const confirmed = window.confirm(
            `Are you sure you want to delete this tenancy for "${tenancy.tenant_name}"?`
        );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(tenancy.id);

            const response = await api.delete(
                `/tenancies/${tenancy.id}`
            );

            console.log(
                'Delete tenancy response:',
                response.data
            );

            await loadTenancies();

        } catch (err) {

            console.error(
                'Delete tenancy error:',
                err
            );

            alert(
                err.response?.data?.message ||
                'Failed to delete tenancy.'
            );

        } finally {

            setDeletingId(null);

        }

    };


    return (
        <div>

            {/* PAGE HEADER */}

            <div className="page-header">

                <div className="page-title">

                    <h1>Tenancies</h1>

                    <p>
                        Assign tenants to rental property units
                    </p>

                </div>


                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />
                    Add Tenancy
                </button>

            </div>


            {/* LIST */}

            <div className="card">

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search tenancies..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                <div className="card-body">

                    {loading && (

                        <div className="empty-state">
                            Loading tenancies...
                        </div>

                    )}


                    {!loading && error && (

                        <div className="error-message">
                            {error}
                        </div>

                    )}


                    {!loading &&
                        !error &&
                        filteredTenancies.length === 0 && (

                            <div className="empty-state">

                                <KeyRound size={40} />

                                <h3>No tenancies found</h3>

                                <p>
                                    No tenancy records are available.
                                </p>

                            </div>

                        )}


                    {!loading &&
                        !error &&
                        filteredTenancies.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>
                                            <th>ID</th>
                                            <th>Tenant</th>
                                            <th>House</th>
                                            <th>Unit</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Advance</th>
                                            <th>Status</th>

                                            <th className="actions-column">
                                                Actions
                                            </th>
                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredTenancies.map(
                                            (tenancy) => (

                                                <tr key={tenancy.id}>

                                                    <td>
                                                        {tenancy.id}
                                                    </td>


                                                    <td>
                                                        <strong>
                                                            {tenancy.tenant_name || '-'}
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        {tenancy.house_name || '-'}
                                                    </td>


                                                    <td>
                                                        {tenancy.property_unit_name || '-'}
                                                    </td>


                                                    <td>
                                                        {formatDateForDisplay(
                                                            tenancy.start_date
                                                        )}
                                                    </td>


                                                    <td>
                                                        {formatDateForDisplay(
                                                            tenancy.end_date
                                                        )}
                                                    </td>


                                                    <td>
                                                        {Number(
                                                            tenancy.advance_amount || 0
                                                        ).toFixed(2)}
                                                    </td>


                                                    <td>

                                                        <span
                                                            className={
                                                                tenancy.status === 'active'
                                                                    ? 'status-badge status-active'
                                                                    : 'status-badge status-ended'
                                                            }
                                                        >
                                                            {tenancy.status}
                                                        </span>

                                                    </td>


                                                    <td>

                                                        <div className="table-actions">

                                                            {/* EDIT */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-edit"
                                                                onClick={() =>
                                                                    openEditModal(tenancy)
                                                                }
                                                                title="Edit Tenancy"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>


                                                            {/* END */}

                                                            {tenancy.status === 'active' && (

                                                                <button
                                                                    type="button"
                                                                    className="action-button action-end"
                                                                    onClick={() =>
                                                                        handleEndTenancy(tenancy)
                                                                    }
                                                                    disabled={
                                                                        endingId === tenancy.id
                                                                    }
                                                                    title="End Tenancy"
                                                                >
                                                                    <LogOut size={15} />
                                                                </button>

                                                            )}


                                                            {/* DELETE ONLY ENDED */}

                                                            {tenancy.status === 'ended' && (

                                                                <button
                                                                    type="button"
                                                                    className="action-button action-delete"
                                                                    onClick={() =>
                                                                        handleDeleteTenancy(tenancy)
                                                                    }
                                                                    disabled={
                                                                        deletingId === tenancy.id
                                                                    }
                                                                    title="Delete Tenancy"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>

                                                            )}

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


            {/* ADD / EDIT MODAL */}

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

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {editingTenancy
                                        ? 'Edit Tenancy'
                                        : 'Add Tenancy'
                                    }
                                </h2>

                                <p>
                                    {editingTenancy
                                        ? 'Update rental assignment'
                                        : 'Assign a tenant to a property unit'
                                    }
                                </p>

                            </div>


                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={18} />
                            </button>

                        </div>


                        <form onSubmit={handleSaveTenancy}>

                            <div className="modal-body">

                                {formError && (

                                    <div className="error-message modal-error">
                                        {formError}
                                    </div>

                                )}


                                {/* TENANT */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Tenant

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        name="tenant_id"
                                        className="form-control"
                                        value={formData.tenant_id}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    >

                                        <option value="">
                                            Select Tenant
                                        </option>

                                        {tenants.map((tenant) => (

                                            <option
                                                key={tenant.id}
                                                value={tenant.id}
                                            >
                                                {tenant.name}
                                                {tenant.phone
                                                    ? ` - ${tenant.phone}`
                                                    : ''
                                                }
                                            </option>

                                        ))}

                                    </select>

                                </div>


                                {/* PROPERTY UNIT */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Property Unit

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        name="property_unit_id"
                                        className="form-control"
                                        value={formData.property_unit_id}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    >

                                        <option value="">
                                            Select Property Unit
                                        </option>

                                        {propertyUnits.map((unit) => (

                                            <option
                                                key={unit.id}
                                                value={unit.id}
                                            >
                                                {unit.house_name
                                                    ? `${unit.house_name} - `
                                                    : ''
                                                }

                                                {unit.name}

                                                {unit.property_type_name
                                                    ? ` (${unit.property_type_name})`
                                                    : ''
                                                }
                                            </option>

                                        ))}

                                    </select>

                                </div>


                                {/* START DATE */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Start Date

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>

                                    <input
                                        type="date"
                                        name="start_date"
                                        className="form-control"
                                        value={formData.start_date}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>


                                {/* END DATE */}

                                <div className="form-group">

                                    <label className="form-label">
                                        End Date
                                    </label>

                                    <input
                                        type="date"
                                        name="end_date"
                                        className="form-control"
                                        value={formData.end_date}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>


                                {/* ADVANCE */}

                                <div className="form-group">

                                    <label className="form-label">
                                        Advance Amount
                                    </label>

                                    <input
                                        type="number"
                                        name="advance_amount"
                                        className="form-control"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        value={formData.advance_amount}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>

                            </div>


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

                                    {editingTenancy
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }

                                    {saving
                                        ? 'Saving...'
                                        : editingTenancy
                                            ? 'Update Tenancy'
                                            : 'Save Tenancy'
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


export default Tenancies;