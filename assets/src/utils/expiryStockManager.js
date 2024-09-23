jQuery(document).ready(function($) {
    const expiryFieldsContainer = $('#expiry_date_fields');
    const expiryInput = $('#expiry_input');
    const expiryRule = $('#_expiry_rule');
    const stockQuantity = $('.wc_input_stock');
    const availableStockDisplay = $('#available_stock_expiry');
    const addExpiryButton = $('button.add-expiry-field');

    // Helper to create expiry field HTML
    function createExpiryField(index) {
        const removeButton = index > 0
            ? '<button type="button" class="remove-expiry-field">&times;</button>'
            : '<span style="padding: 0 14px;"></span>';
        return `
            <tr class="form-field expiry-field-group">
                <td>
             <input type="date" class="short" name="expiry_dates[]" id="expiry_dates_${index}" value="">
               </td>
                <td>
                <input type="number" class="short" min="1" step="1" name="expiry_quantities[]" id="expiry_quantities_${index}" value="1">
                </td>
                <td>
                <input type="text" class="short" name="expiry_company[]"  id="expiry_company_${index}" value="">
                </td>
                <td><input type="number" class="short" name="expiry_buying_price[]" min="0" step="0.01" id="expiry_buying_price_${index}" value="0">
                </td>
                <td>
                ${removeButton}
                </td>
            </tr>`;
    }

    // Calculate total expiry quantity
    function getTotalExpiryQuantity() {
        const expiryQuantityFields = expiryInput.find('[id^="expiry_quantities_"]');
        if (expiryQuantityFields.length === 0 || expiryRule.val() === 'no') {
            return 0;
        }
        return expiryQuantityFields.map(function() {
            return parseInt($(this).val()) || 0;
        }).get().reduce((a, b) => a + b, 0);
    }

    // Calculate available stock quantity
    function getAvailableStock() {
        const stock = parseInt(stockQuantity.val()) || 0;
        const totalExpiry = getTotalExpiryQuantity();
        return Math.max(stock - totalExpiry, 0);
    }

    // Toggle add expiry button based on stock availability
    function toggleAddExpiryButton() {
        if (hasAvailableStock()) {
            addExpiryButton.prop('disabled', false);
        } else {
            addExpiryButton.prop('disabled', true);
        }
    }

    // Set available stock display and styling
    function updateAvailableStockDisplay(availableStock = getAvailableStock()) {
        availableStockDisplay.text(availableStock);
        if (availableStock <= 0) {
            availableStockDisplay.addClass('not_available_expiry').removeClass('available_expiry');
        } else {
            availableStockDisplay.addClass('available_expiry').removeClass('not_available_expiry');
        }
        toggleAddExpiryButton();
    }

    // Check if there's enough available stock
    function hasAvailableStock() {
        return getAvailableStock() > 0;
    }

    // Validate expiry quantities in real-time
    function validateStockQuantitiesRealTime(inputField) {
        const totalStock = parseInt(stockQuantity.val()) || 0;
        const totalExpiry = getTotalExpiryQuantity();

        if (totalStock < totalExpiry) {
            inputField[0].setCustomValidity('Stock exceeds available quantity! Please adjust the stock quantity.');
            inputField[0].reportValidity();
            inputField.val(inputField.data('oldValue'));
        } else {
            inputField[0].setCustomValidity('');
            inputField.data('oldValue', inputField.val());
            updateAvailableStockDisplay();
        }
    }

    // Store old value of expiry quantity on focus
    expiryInput.on('focus', '[id^="expiry_quantities_"]', function() {
        $(this).data('oldValue', $(this).val());
    });

    // Validate expiry quantity input on change
    expiryInput.on('input', '[id^="expiry_quantities_"]', function() {
        validateStockQuantitiesRealTime($(this));
    });

    // Update available stock when stock quantity changes
    stockQuantity.on('change', function() {
        const stockVal = parseInt($(this).val()) || 0;
        if (stockVal > 0) {
            expiryRule.prop('disabled', false);
            updateAvailableStockDisplay(expiryRule.val() === 'yes' ? getAvailableStock() : stockVal);
        } else {
            expiryRule.prop('disabled', true).val('no');
            expiryFieldsContainer.hide();
        }
    }).trigger('change');

    // Enable or disable expiry fields based on stock management checkbox
    $('#_manage_stock').on('change', function() {
        if ($(this).is(":checked") && stockQuantity.val() > 0) {
            expiryRule.prop('disabled', false);
        } else {
            expiryRule.prop('disabled', true).val('no');
            expiryFieldsContainer.hide();
        }
    }).trigger('change');

    // Show or hide expiry fields based on the expiry rule selection
    expiryRule.on('change', function() {
        const rule = $(this).val();
        if (rule === 'yes') {
            // Add first expiry field if none exists
            if (expiryInput.find('.expiry-field-group').length === 0) {
                expiryInput.append(createExpiryField(0));
            }
            expiryFieldsContainer.show();
            updateAvailableStockDisplay();
        } else {
            expiryFieldsContainer.hide().find('.expiry-field-group').remove();
        }
    });

    // Add a new expiry field on button click
    addExpiryButton.on('click', function() {
        const fieldCount = expiryInput.find('.expiry-field-group').length;
        if (hasAvailableStock()) {
            expiryInput.append(createExpiryField(fieldCount));
            updateAvailableStockDisplay();
        }
    });

    // Remove an expiry field on click
    expiryFieldsContainer.on('click', '.remove-expiry-field', function() {
        $(this).closest('.expiry-field-group').remove();
        updateAvailableStockDisplay();
    });
});
