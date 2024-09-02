jQuery(document).ready(function($) {

    // Function to add expiry date and quantity fields
    function addExpiryField(index) {
        const buttonField = index > 0 ? '<button type="button" class="remove-expiry-field button">&times;</button>' : '<span style="padding: 0 14px;"></span>'
        return`<p class="form-field expiry-field-group">
                <input type="date" class="short" name="expiry_dates[]" id="expiry_dates_${index}" value="">
                <input type="number" class="short" min="1" name="expiry_quantities[]" id="expiry_quantities_${index}" value="1">
                ${buttonField}
            </p>`;
    }
    const expiryFieldsContainer = $('#expiry_date_fields');
    const expiryInput = $('#expiry_input');
    // Show or hide expiry fields based on the expiry rule selection
    $('#_expiry_rule').change(function() {
        const rule = $(this).val();

        if (rule === 'yes') {
            // Add initial field if none exists
            if (expiryInput.find('.expiry-field-group').length === 0) {
                expiryInput.append(addExpiryField(0));
            }
            // Show the fields container
            expiryFieldsContainer.show();
        } else {
            // Hide and remove all fields
            expiryInput.empty();
            expiryFieldsContainer.hide();
        }
    }).trigger('change');

    // Add new expiry field
    expiryFieldsContainer.on('click', '.add-expiry-field', function() {
        const index = expiryInput.find('.expiry-field-group').length;
        expiryInput.append(addExpiryField(index));
    });

    // Remove expiry field
    expiryFieldsContainer.on('click', '.remove-expiry-field', function() {
        if (expiryInput.find('.expiry-field-group').length <= 1) {
            return;
        }
        $(this).closest('.expiry-field-group').remove();
    });
});
