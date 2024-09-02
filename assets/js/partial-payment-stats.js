async function generateReceiptPDF(printdata, settings) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    let yPosition = 20;
    // Add Header
    if (settings.wepos_receipts && settings.wepos_receipts.receipt_header) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.wepos_receipts.receipt_header.trim();
        document.body.appendChild(tempDiv);

        yPosition = (tempDiv.getElementsByTagName('p').length * 5) + 10;

        await doc.html( tempDiv, {
            callback: function (pdf) {
                document.body.removeChild(tempDiv); // Clean up
                return pdf;
            },
            x: 160,  // X position (margin)
            y: 10,  // Y position (margin)
            html2canvas: {
                scale: 0.28  // Adjust scale if needed
            }
        });
    }

    doc.setFontSize(10);
    let bPosition = yPosition;
    if (printdata.billing){
        doc.setFont("Helvetica", "normal");
        (printdata.billing.first_name || printdata.billing.last_name) && doc.text(printdata.billing.first_name + ' ' + printdata.billing.last_name, 11, bPosition);
        bPosition += 5
        printdata.billing.email && doc.text(printdata.billing.email, 11, bPosition);
        bPosition += 5
        printdata.billing.phone && doc.text('Phone: ' + printdata.billing.phone, 11, bPosition);
        bPosition += 5
        printdata.billing.nif && doc.text('NIF: ' + printdata.billing.nif, 11, bPosition);
        bPosition += 5
        printdata.billing.address_1 && doc.text(printdata.billing.address_1, 11, bPosition);
    }

    // Add Order Info

    yPosition = yPosition < bPosition ? bPosition + 10 : yPosition + 20;
    doc.text(`Order ID: #${printdata.id}`, 11, yPosition);
    doc.text(`Order Date: ${new Date(printdata.date_created).toLocaleString()}`, 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 5;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);

    // Add Line Items
     yPosition += 10;
    doc.setFont("Helvetica", "bold");
    doc.text('Product', 11, yPosition);
    doc.text('Quantity', 100, yPosition, {align: 'center'});
    doc.text('Price', 198, yPosition, {align: 'right'});
    yPosition += 10;

    printdata.line_items.forEach(item => {
        doc.setFont("Helvetica", "bold");
        doc.text(item.name, 11, yPosition);
        doc.setFont("Helvetica", "normal");
        doc.text(`${item.quantity}`, 100, yPosition, {align: 'center'});

        doc.text(formatPrice(item.subtotal), 198, yPosition, {align: 'right'});

        // Add attributes
        if (item.meta_data && item.meta_data.length > 0) {
            item.meta_data.forEach(attribute_item => {
                yPosition += 5;
                doc.setFontSize(9);
                doc.text(`${attribute_item.display_key}: ${attribute_item.display_value}`, 12, yPosition);
            });
        }

        const itemTotal = parseFloat(item.total);
        const itemSubtotal = parseFloat(item.subtotal);
        const discount = itemSubtotal - itemTotal;
        if (discount > 0) {
            yPosition += 5;
            doc.text(`Discount: -${formatPrice(discount.toFixed(2))}`, 12, yPosition);
        }
        yPosition += 10;
    });

    // Add Subtotal
    const total = parseFloat(printdata.total)
    const discount = parseFloat(printdata.discount_total)
    const subtotal = total + discount
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    yPosition += 5;
    doc.text(`Subtotal:`, 11, yPosition);
    doc.text(formatPrice(subtotal.toFixed(2)), 198, yPosition, {align: 'right'});

    // Add Discounts, Fees, Tax, and Total
    yPosition += 10;

    // Discount
    if (printdata.coupon_lines && printdata.coupon_lines.length > 0) {
        const fixedDiscount = printdata.coupon_lines.some(coupon => coupon.discount_type === "fixed_product")
        if (fixedDiscount) {
            doc.text(`Discount:`, 11, yPosition);
            doc.text(`-${formatPrice(printdata.discount_total)}`, 198, yPosition, {align: 'right'});
            yPosition += 5;
        }else {
            printdata.coupon_lines.forEach(fee => {
                doc.text(`Discount:`, 11, yPosition);
                doc.text(`-${formatPrice(Math.abs(fee.discount))}`, 198, yPosition, {align: 'right'});
                yPosition += 5;
            });
        }
    }

    // Fees
    if (printdata.fee_lines && printdata.fee_lines.length > 0) {
        printdata.fee_lines.forEach(fee => {
            doc.text(`Fee:`, 11, yPosition);
            doc.text(formatPrice(Math.abs(fee.fee)), 198, yPosition, {align: 'right'});
            yPosition += 5;
        });
    }

    // Tax
    if (printdata.total_tax > 0) {
        doc.text(`Tax:`, 11, yPosition);
        doc.text(formatPrice(printdata.total_tax), 198, yPosition, {align: 'right'});
        yPosition += 5;
    }

    // Order Total
    yPosition += 5;
    doc.setFont("Helvetica", "bold");
    doc.text(`Order Total:`, 11, yPosition);
    doc.text(formatPrice(printdata.total), 198, yPosition, {align: 'right'});

    // Divider
    yPosition += 10;
    doc.setLineDash([1, 1], 0)
    doc.setLineWidth(0,5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Payment Method
    doc.setFont("Helvetica", "normal");
    doc.text('Payment method:', 10, yPosition);
    doc.text(printdata.payment_method_title || '', 198, yPosition, {align: 'right'});
    yPosition += 10;

    // Payment Type
    doc.text('Payment Type:', 10, yPosition);
    doc.text(printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') ? 'Partial Payment' : 'Full Payment', 198, yPosition, {align: 'right'});
    yPosition += 10;

    // Payment Date
    doc.text('Payment Date:', 10, yPosition);
    doc.text(printdata.date_partial_paid, 198, yPosition, {align: 'right'});
    yPosition += 10;

    // total Paid/Due Amount
    if (printdata.payment_method === 'wepos_cash' && printdata.meta_data.some((data) => data.key === '_wepos_cash_payment_type' && data.value === 'partial') && printdata.total_partial_due > 0) {
        // Paid Amount
        doc.setFont("Helvetica", "bold");
        doc.text('Paid Amount:', 10, yPosition);
        doc.text(formatPrice(printdata.partial_paid_amount), 198, yPosition, {align: 'right'});
        yPosition += 10;

        // Divider
        doc.setLineDash([1, 1], 0)
        doc.setLineWidth(0,5);
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 10;

        // total Paid
        doc.text('Total Paid:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_paid), 198, yPosition, {align: 'right'});
        yPosition += 10;

        // total Due
        doc.setFont("Helvetica", "bold");
        doc.text('Total Due:', 10, yPosition);
        doc.text(formatPrice(printdata.total_partial_due), 198, yPosition, {align: 'right'});
        yPosition += 10;

    }

    // Add Footer
    yPosition += 20;
    if (settings.wepos_receipts && settings.wepos_receipts.receipt_footer) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.wepos_receipts.receipt_footer;
        document.body.appendChild(tempDiv);

        await doc.html(tempDiv, {
            callback: function (pdf) {
                document.body.removeChild(tempDiv); // Clean up
                return pdf;
            },
            x: 100,  // X position (margin)
            y: yPosition,  // Y position (margin)
            html2canvas: {
                scale: 0.30  // Adjust scale if needed
            }
        });
    }

    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl);
}

function formatPrice(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

jQuery(document).ready(function($) {
    $('.partial-payment-stats').on('click', async function(e) {
        e.preventDefault();
        let printData = {};
        const partialReceipt = $(e.target.closest('.partial-receipt'))
        const partialPaidAmount = parseFloat(partialReceipt.attr('data-partial-paid-amount')?? 0).toFixed(2);
        const totalPartialPaid = parseFloat(partialReceipt.attr('data-partial-paid')?? 0).toFixed(2);
        const totalPartialDue = parseFloat(partialReceipt.attr('data-partial-due')?? 0).toFixed(2);
        const datePartialPaid = partialReceipt.attr('data-date-partial-paid');

        try {
            const response = await $.ajax({
                type: 'POST',
                url: `${weposData.orderUrl}/${partialPaymentData.orderId}`,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', weposData.nonce); // Set nonce header for security
                }
            });
            printData = response;
            printData.total_partial_paid = totalPartialPaid;
            printData.total_partial_due = totalPartialDue;
            printData.partial_paid_amount = partialPaidAmount;
            printData.date_partial_paid= datePartialPaid;
            console.log(printData,partialPaymentData, partialPaymentData.settings.wepos_receipts.receipt_header);
            const parser = new DOMParser(),
                dom = parser.parseFromString(partialPaymentData.settings.wepos_receipts.receipt_header, "text/html");
            console.log(dom.querySelector('body').innerHTML);
            await generateReceiptPDF(printData, partialPaymentData.settings);
        } catch (error) {
            console.log(error);
        }

    });
});
