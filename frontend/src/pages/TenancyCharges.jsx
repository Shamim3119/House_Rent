import { useEffect, useState } from 'react';

import {
    CircleDollarSign,
    Search,
    Plus,
    Pencil,
    Trash2,
    X
} from 'lucide-react';

import api from '../api/axios';


const TenancyCharges = () => {

    /* =====================================================
       STATE
    ===================================================== */

    const [charges, setCharges] = useState([]);
    const [tenancies, setTenancies] = useState([]);
    const [billingItems, setBillingItems] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingCharge, setEditingCharge] = useState(null);

    const [formData, setFormData] = useState({
        tenancy_id: '',
        billing_item_id: '',
        amount: ''
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [deletingId, setDeletingId] = useState(null);


    /* =====================================================
       LOAD TENANCY CHARGES
    ===================================================== */

    const loadCharges = async () => {

        try {

            setLoading(true);
            setError('');

            const response = await api.get(
                '/tenancy-charges'
            );

            console.log(
                'Tenancy Charges API response:',
                response.data
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setCharges(data);

        } catch (err) {

            console.error(
                'Load tenancy charges error:',
                err
            );

            setError(
                err.response?.data?.message ||
                'Failed to load tenancy charges.'
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       LOAD TENANCIES
    ===================================================== */

    const loadTenancies = async () => {

        try {

            const response = await api.get(
                '/tenancies'
            );

            console.log(
                'Tenancies for charge:',
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

        }

    };


    /* =====================================================
       LOAD BILLING ITEMS
    ===================================================== */

    const loadBillingItems = async () => {

        try {

            const response = await api.get(
                '/billing-items'
            );

            console.log(
                'Billing items for charge:',
                response.data
            );

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setBillingItems(data);

        } catch (err) {

            console.error(
                'Load billing items error:',
                err
            );

        }

    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadCharges();
        loadTenancies();
        loadBillingItems();

    }, []);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredCharges = charges.filter((charge) => {

        const keyword = search
            .trim()
            .toLowerCase();

        return (
            charge.tenant_name
                ?.toLowerCase()
                .includes(keyword) ||

            charge.house_name
                ?.toLowerCase()
                .includes(keyword) ||

            charge.property_unit_name
                ?.toLowerCase()
                .includes(keyword) ||

            charge.billing_item_name
                ?.toLowerCase()
                .includes(keyword)
        );

    });


    /* =====================================================
       ACTIVE TENANCIES
    ===================================================== */

    const activeTenancies = tenancies.filter(
        (tenancy) =>
            tenancy.status === 'active'
    );


    /* =====================================================
       OPEN ADD
    ===================================================== */

    const openAddModal = () => {

        setEditingCharge(null);

        setFormData({
            tenancy_id: '',
            billing_item_id: '',
            amount: ''
        });

        setFormError('');
        setShowModal(true);

    };


    /* =====================================================
       OPEN EDIT
    ===================================================== */

    const openEditModal = (charge) => {

        console.log(
            'Editing tenancy charge:',
            charge
        );

        setEditingCharge(charge);

        setFormData({

            tenancy_id:
                charge.tenancy_id
                    ? String(charge.tenancy_id)
                    : '',

            billing_item_id:
                charge.billing_item_id
                    ? String(charge.billing_item_id)
                    : '',

            amount:
                charge.amount ?? ''

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
        setEditingCharge(null);
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

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    /* =====================================================
       SAVE ADD / EDIT
    ===================================================== */

    const handleSaveCharge = async (e) => {

        e.preventDefault();

        setFormError('');


        /* ---------------------------------------------
           VALIDATE TENANCY
        --------------------------------------------- */

        if (!formData.tenancy_id) {

            setFormError(
                'Please select a tenancy.'
            );

            return;

        }


        /* ---------------------------------------------
           VALIDATE BILLING ITEM
        --------------------------------------------- */

        if (!formData.billing_item_id) {

            setFormError(
                'Please select a billing item.'
            );

            return;

        }


        /* ---------------------------------------------
           VALIDATE AMOUNT
        --------------------------------------------- */

        if (formData.amount === '') {

            setFormError(
                'Amount is required.'
            );

            return;

        }


        const amount = Number(
            formData.amount
        );


        if (
            Number.isNaN(amount) ||
            amount < 0
        ) {

            setFormError(
                'Amount must be zero or greater.'
            );

            return;

        }


        /* ---------------------------------------------
           PAYLOAD
        --------------------------------------------- */

        const payload = {

            tenancy_id:
                Number(formData.tenancy_id),

            billing_item_id:
                Number(formData.billing_item_id),

            amount:
                amount

        };


        console.log(
            'Tenancy Charge payload:',
            payload
        );


        try {

            setSaving(true);


            /* =========================================
               EDIT
            ========================================= */

            if (editingCharge) {

                const response = await api.put(
                    `/tenancy-charges/${editingCharge.id}`,
                    payload
                );

                console.log(
                    'Update tenancy charge response:',
                    response.data
                );

            }


            /* =========================================
               ADD
            ========================================= */

            else {

                const response = await api.post(
                    '/tenancy-charges',
                    payload
                );

                console.log(
                    'Create tenancy charge response:',
                    response.data
                );

            }


            setShowModal(false);
            setEditingCharge(null);

            setFormData({
                tenancy_id: '',
                billing_item_id: '',
                amount: ''
            });


            await loadCharges();


        } catch (err) {

            console.error(
                'Save tenancy charge error:',
                err
            );


            setFormError(
                err.response?.data?.message ||
                (
                    editingCharge
                        ? 'Failed to update tenancy charge.'
                        : 'Failed to create tenancy charge.'
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* =====================================================
       DELETE
    ===================================================== */

    const handleDeleteCharge = async (charge) => {

        const itemName =
            charge.billing_item_name ||
            'this charge';


        const confirmed = window.confirm(
            `Are you sure you want to delete "${itemName}"?`
        );


        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(charge.id);
            setError('');


            const response = await api.delete(
                `/tenancy-charges/${charge.id}`
            );


            console.log(
                'Delete tenancy charge response:',
                response.data
            );


            await loadCharges();


        } catch (err) {

            console.error(
                'Delete tenancy charge error:',
                err
            );


            alert(
                err.response?.data?.message ||
                'Failed to delete tenancy charge.'
            );


        } finally {

            setDeletingId(null);

        }

    };


    /* =====================================================
       MONEY FORMAT
    ===================================================== */

    const formatAmount = (amount) => {

        const value = Number(amount || 0);

        return value.toLocaleString(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

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
                        Tenancy Charges
                    </h1>

                    <p>
                        Configure monthly charges for active tenancies
                    </p>

                </div>


                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openAddModal}
                >
                    <Plus size={17} />

                    Add Charge
                </button>

            </div>


            {/* =================================================
                LIST
            ================================================= */}

            <div className="card">

                {/* SEARCH */}

                <div className="card-header house-toolbar">

                    <div className="house-search">

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search charges..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                <div className="card-body">

                    {/* LOADING */}

                    {loading && (

                        <div className="empty-state">

                            <p>
                                Loading tenancy charges...
                            </p>

                        </div>

                    )}


                    {/* ERROR */}

                    {!loading && error && (

                        <div className="error-message">
                            {error}
                        </div>

                    )}


                    {/* EMPTY */}

                    {!loading &&
                        !error &&
                        filteredCharges.length === 0 && (

                            <div className="empty-state">

                                <CircleDollarSign
                                    size={40}
                                />

                                <h3>
                                    No tenancy charges found
                                </h3>

                                <p>
                                    Add monthly charges to an active tenancy.
                                </p>

                            </div>

                        )}


                    {/* =================================================
                        TABLE
                    ================================================= */}

                    {!loading &&
                        !error &&
                        filteredCharges.length > 0 && (

                            <div className="table-responsive">

                                <table className="data-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                ID
                                            </th>

                                            <th>
                                                Tenant
                                            </th>

                                            <th>
                                                House
                                            </th>

                                            <th>
                                                Unit
                                            </th>

                                            <th>
                                                Billing Item
                                            </th>

                                            <th>
                                                Amount
                                            </th>

                                            <th className="actions-column">
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredCharges.map(
                                            (charge) => (

                                                <tr key={charge.id}>

                                                    {/* ID */}

                                                    <td>
                                                        {charge.id}
                                                    </td>


                                                    {/* TENANT */}

                                                    <td>

                                                        <strong>
                                                            {charge.tenant_name || '-'}
                                                        </strong>

                                                    </td>


                                                    {/* HOUSE */}

                                                    <td>
                                                        {charge.house_name || '-'}
                                                    </td>


                                                    {/* UNIT */}

                                                    <td>
                                                        {charge.property_unit_name || '-'}
                                                    </td>


                                                    {/* BILLING ITEM */}

                                                    <td>

                                                        <div className="house-name-cell">

                                                            <div className="house-icon">

                                                                <CircleDollarSign
                                                                    size={16}
                                                                />

                                                            </div>

                                                            <span>
                                                                {charge.billing_item_name || '-'}
                                                            </span>

                                                        </div>

                                                    </td>


                                                    {/* AMOUNT */}

                                                    <td>

                                                        <strong>
                                                            {formatAmount(
                                                                charge.amount
                                                            )}
                                                        </strong>

                                                    </td>


                                                    {/* ACTIONS */}

                                                    <td>

                                                        <div className="table-actions">

                                                            {/* EDIT */}

                                                            <button
                                                                type="button"
                                                                className="action-button action-edit"
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        charge
                                                                    )
                                                                }
                                                                title="Edit Charge"
                                                                aria-label="Edit Charge"
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
                                                                    handleDeleteCharge(
                                                                        charge
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingId ===
                                                                    charge.id
                                                                }
                                                                title="Delete Charge"
                                                                aria-label="Delete Charge"
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

                        {/* HEADER */}

                        <div className="modal-header">

                            <div>

                                <h2>

                                    {editingCharge
                                        ? 'Edit Tenancy Charge'
                                        : 'Add Tenancy Charge'
                                    }

                                </h2>


                                <p>

                                    {editingCharge
                                        ? 'Update the monthly charge'
                                        : 'Add a monthly charge to a tenancy'
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


                        {/* =================================================
                            FORM
                        ================================================= */}

                        <form
                            onSubmit={handleSaveCharge}
                        >

                            <div className="modal-body">


                                {/* ERROR */}

                                {formError && (

                                    <div className="error-message modal-error">

                                        {formError}

                                    </div>

                                )}


                                {/* =========================================
                                    TENANCY
                                ========================================= */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Tenancy

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        name="tenancy_id"
                                        className="form-control"
                                        value={formData.tenancy_id}
                                        onChange={handleFormChange}
                                        disabled={
                                            saving ||
                                            Boolean(editingCharge)
                                        }
                                    >

                                        <option value="">
                                            Select Tenancy
                                        </option>


                                        {/*
                                          During Edit, include the existing
                                          tenancy even if it is ended.
                                        */}

                                        {tenancies
                                            .filter((tenancy) =>
                                                tenancy.status === 'active' ||
                                                String(tenancy.id) ===
                                                String(formData.tenancy_id)
                                            )
                                            .map((tenancy) => (

                                                <option
                                                    key={tenancy.id}
                                                    value={tenancy.id}
                                                >

                                                    {tenancy.tenant_name || 'Tenant'}

                                                    {' - '}

                                                    {tenancy.house_name
                                                        ? `${tenancy.house_name} / `
                                                        : ''
                                                    }

                                                    {tenancy.property_unit_name ||
                                                        'Unit'}

                                                </option>

                                            ))}

                                    </select>

                                </div>


                                {/* =========================================
                                    BILLING ITEM
                                ========================================= */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Billing Item

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <select
                                        name="billing_item_id"
                                        className="form-control"
                                        value={formData.billing_item_id}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    >

                                        <option value="">
                                            Select Billing Item
                                        </option>


                                        {billingItems.map(
                                            (item) => (

                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* =========================================
                                    AMOUNT
                                ========================================= */}

                                <div className="form-group">

                                    <label className="form-label">

                                        Amount

                                        <span className="required-mark">
                                            *
                                        </span>

                                    </label>


                                    <input
                                        type="number"
                                        name="amount"
                                        className="form-control"
                                        placeholder="Example: 20000"
                                        min="0"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                    />

                                </div>


                                {/* INFORMATION */}

                                {!editingCharge &&
                                    activeTenancies.length === 0 && (

                                        <div className="error-message">

                                            There are no active tenancies.
                                            Create an active tenancy before
                                            adding charges.

                                        </div>

                                    )}

                            </div>


                            {/* =================================================
                                FOOTER
                            ================================================= */}

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
                                    disabled={
                                        saving ||
                                        (
                                            !editingCharge &&
                                            activeTenancies.length === 0
                                        )
                                    }
                                >

                                    {editingCharge
                                        ? <Pencil size={16} />
                                        : <Plus size={16} />
                                    }


                                    {saving
                                        ? 'Saving...'
                                        : editingCharge
                                            ? 'Update Charge'
                                            : 'Save Charge'
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


export default TenancyCharges;