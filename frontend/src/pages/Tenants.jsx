import { useEffect, useState } from 'react';

import {
    Users,
    Search,
    Plus,
    Pencil,
    Trash2,
    X
} from 'lucide-react';

import api from '../api/axios';


const Tenants = () => {

    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        nid: '',
        address: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [deletingId, setDeletingId] = useState(null);


    /* =====================================================
       LOAD TENANTS
    ===================================================== */

    const loadTenants = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get('/tenants');

            console.log(
                'Tenants API response:',
                response.data
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setTenants(data);

        } catch (err) {

            console.error(
                'Load tenants error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load tenants.'
            );

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        loadTenants();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredTenants = tenants.filter((tenant) => {

        const keyword = search
            .trim()
            .toLowerCase();

        return (
            tenant.name
                ?.toLowerCase()
                .includes(keyword) ||

            tenant.phone
                ?.toLowerCase()
                .includes(keyword) ||

            tenant.nid
                ?.toLowerCase()
                .includes(keyword) ||

            tenant.address
                ?.toLowerCase()
                .includes(keyword)
        );

    });


    /* =====================================================
       ADD
    ===================================================== */

    const openAddModal = () => {

        setEditingTenant(null);

        setFormData({
            name: '',
            phone: '',
            nid: '',
            address: ''
        });

        setFormError('');
        setShowModal(true);

    };


    /* =====================================================
       EDIT
    ===================================================== */

    const openEditModal = (tenant) => {

        setEditingTenant(tenant);

        setFormData({
            name: tenant.name || '',
            phone: tenant.phone || '',
            nid: tenant.nid || '',
            address: tenant.address || ''
        });

        setFormError('');
        setShowModal(true);

    };


    /* =====================================================
       CLOSE
    ===================================================== */

    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingTenant(null);
        setFormError('');

    };


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleFormChange = (e) => {

        const { name, value } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));

    };


    /* =====================================================
       SAVE
    ===================================================== */

    const handleSaveTenant = async (e) => {

        e.preventDefault();

        setFormError('');

        if (!formData.name.trim()) {

            setFormError(
                'Tenant name is required.'
            );

            return;

        }


        const payload = {

            name: formData.name.trim(),

            phone:
                formData.phone.trim() || null,

            nid:
                formData.nid.trim() || null,

            address:
                formData.address.trim() || null

        };


        try {

            setSaving(true);


            /* EDIT */

            if (editingTenant) {

                const response = await api.put(
                    `/tenants/${editingTenant.id}`,
                    payload
                );

                console.log(
                    'Update tenant response:',
                    response.data
                );

            }

            /* ADD */

            else {

                const response = await api.post(
                    '/tenants',
                    payload
                );

                console.log(
                    'Create tenant response:',
                    response.data
                );

            }


            setShowModal(false);
            setEditingTenant(null);

            setFormData({
                name: '',
                phone: '',
                nid: '',
                address: ''
            });

            await loadTenants();

        } catch (err) {

            console.error(
                'Save tenant error:',
                err
            );

            setFormError(
                err.response?.data?.message ||
                (
                    editingTenant
                        ? 'Failed to update tenant.'
                        : 'Failed to create tenant.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       DELETE
    ===================================================== */

    const handleDeleteTenant = async (tenant) => {

        const confirmed = window.confirm(
            `Are you sure you want to delete "${tenant.name}"?`
        );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(tenant.id);
            setError('');

            const response = await api.delete(
                `/tenants/${tenant.id}`
            );

            console.log(
                'Delete tenant response:',
                response.data
            );

            await loadTenants();

        } catch (err) {

            console.error(
                'Delete tenant error:',
                err
            );

            alert(
                err.response?.data?.message ||
                'Failed to delete tenant.'
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

            {/* PAGE HEADER */}

            <div className="page-header">

                <div className="page-title">

                    <h1>Tenants</h1>

                    <p>
                        Manage tenant information
                    </p>

                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />
                    Add Tenant
                </button>

            </div>


            {/* LIST */}

            <div className="card">

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search tenants..."
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
                            <p>Loading tenants...</p>
                        </div>

                    )}


                    {!loading && error && (

                        <div className="error-message">
                            {error}
                        </div>

                    )}


                    {!loading &&
                        !error &&
                        filteredTenants.length === 0 && (

                            <div className="empty-state">

                                <Users size={40} />

                                <h3>No tenants found</h3>

                                <p>
                                    No tenant records are available.
                                </p>

                            </div>

                        )}


                    {!loading &&
                        !error &&
                        filteredTenants.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>
                                            <th>ID</th>
                                            <th>Tenant Name</th>
                                            <th>Phone</th>
                                            <th>NID</th>
                                            <th>Address</th>

                                            <th className="actions-column">
                                                Actions
                                            </th>
                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredTenants.map(
                                            (tenant) => (

                                                <tr key={tenant.id}>

                                                    <td>
                                                        {tenant.id}
                                                    </td>


                                                    <td>

                                                        <div className="house-name-cell">

                                                            <div className="house-icon">
                                                                <Users size={16} />
                                                            </div>

                                                            <span>
                                                                {tenant.name}
                                                            </span>

                                                        </div>

                                                    </td>


                                                    <td>
                                                        {tenant.phone || '-'}
                                                    </td>


                                                    <td>
                                                        {tenant.nid || '-'}
                                                    </td>


                                                    <td>
                                                        {tenant.address || '-'}
                                                    </td>


                                                    <td>

                                                        <div className="table-actions">

                                                            <button
                                                                type="button"
                                                                className="action-button action-edit"
                                                                onClick={() =>
                                                                    openEditModal(tenant)
                                                                }
                                                                title="Edit Tenant"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>


                                                            <button
                                                                type="button"
                                                                className="action-button action-delete"
                                                                onClick={() =>
                                                                    handleDeleteTenant(tenant)
                                                                }
                                                                disabled={
                                                                    deletingId === tenant.id
                                                                }
                                                                title="Delete Tenant"
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

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {editingTenant
                                        ? 'Edit Tenant'
                                        : 'Add Tenant'
                                    }
                                </h2>

                                <p>
                                    {editingTenant
                                        ? 'Update tenant information'
                                        : 'Create a new tenant'
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


                        <form onSubmit={handleSaveTenant}>

                            <div className="modal-body">

                                {formError && (

                                    <div className="error-message modal-error">
                                        {formError}
                                    </div>

                                )}


                                {/* NAME */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="tenant-name"
                                    >
                                        Tenant Name

                                        <span className="required-mark">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        id="tenant-name"
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        placeholder="Enter tenant name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        autoFocus
                                        disabled={saving}
                                    />

                                </div>


                                {/* PHONE */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="tenant-phone"
                                    >
                                        Phone
                                    </label>

                                    <input
                                        id="tenant-phone"
                                        type="text"
                                        name="phone"
                                        className="form-control"
                                        placeholder="Example: 017XXXXXXXX"
                                        value={formData.phone}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>


                                {/* NID */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="tenant-nid"
                                    >
                                        NID
                                    </label>

                                    <input
                                        id="tenant-nid"
                                        type="text"
                                        name="nid"
                                        className="form-control"
                                        placeholder="Enter NID number"
                                        value={formData.nid}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>


                                {/* ADDRESS */}

                                <div className="form-group">

                                    <label
                                        className="form-label"
                                        htmlFor="tenant-address"
                                    >
                                        Address
                                    </label>

                                    <textarea
                                        id="tenant-address"
                                        name="address"
                                        className="form-control form-textarea"
                                        placeholder="Enter tenant address"
                                        value={formData.address}
                                        onChange={handleFormChange}
                                        rows="3"
                                        disabled={saving}
                                    />

                                </div>

                            </div>


                            {/* FOOTER */}

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

                                    {editingTenant
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }

                                    {saving
                                        ? 'Saving...'
                                        : editingTenant
                                            ? 'Update Tenant'
                                            : 'Save Tenant'
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


export default Tenants;