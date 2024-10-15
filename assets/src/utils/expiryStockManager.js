jQuery(document).ready(
    function ($) {
        const expiryFieldsContainer = $('#expiry_date_fields');
        const expiryInput = $('#expiry_input');
        const expiryRule = $('#_expiry_rule');
        const stockQuantity = $('#_stock');
        const manageStock = $('#_manage_stock');
        const addExpiryButton = $('button.add-expiry-field');

        // Helper to create expiry field HTML.
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

        // Calculate total expiry quantity.
        function getTotalExpiryQuantity() {
            const expiryQuantityFields = expiryInput.find('[id^="expiry_quantities_"]');
            if (expiryQuantityFields.length === 0 || expiryRule.val() === 'no') {
                return 0;
            }
            return expiryQuantityFields.map(
                function () {
                    return parseInt($(this).val()) || 0;
                }
            ).get().reduce((a, b) => a + b, 0);
        }

        // Update available stock display.
        function updateStockQuantitiesRealTime() {
            stockQuantity.val(getTotalExpiryQuantity());
        }

        // Validate expiry quantity input on change.
        expiryInput.add($('[id^="expiry_quantities_"]')).on(
            'input scroll',
            function () {
                updateStockQuantitiesRealTime();
            }
        );

        // Hide expiry fields if manage stock is unchecked.
        manageStock.on('change', function () {
            if (!manageStock.is(':checked')) {
                expiryRule.val('no').trigger('change');
            }
        });

        // Show or hide expiry fields based on the expiry rule selection.
        expiryRule.on(
            'change',
            function () {
                const rule = $(this).val();
                if (rule === 'yes') {
                    // Add first expiry field if none exists.
                    if (expiryInput.find('.expiry-field-group').length === 0) {
                        expiryInput.append(createExpiryField(0));
                    }
                    expiryFieldsContainer.show();
                } else {
                    expiryFieldsContainer.hide().find('.expiry-field-group').remove();
                }

                manageStock.prop( 'checked', rule === 'yes' );
                stockQuantity.prop( 'disabled', rule === 'yes' );
                $( '.stock_fields' ).css( 'display', rule === 'yes' ? '' : 'none' );
                updateStockQuantitiesRealTime();
            }
        );

        // Add a new expiry field on button click.
        addExpiryButton.on(
            'click',
            function () {
                const fieldCount = expiryInput.find('.expiry-field-group').length;
                expiryInput.append(createExpiryField(fieldCount));
                updateStockQuantitiesRealTime();
            }
        );

        // Remove an expiry field on button click.
        expiryFieldsContainer.on(
            'click',
            '.remove-expiry-field',
			function () {
				$(this).closest('.expiry-field-group').remove();
				updateStockQuantitiesRealTime();
			}
		);
	}
);
