(()=>{var __webpack_modules__={"./assets/src/utils/partialPaymentStatsReceipt.js":
/*!********************************************************!*\
  !*** ./assets/src/utils/partialPaymentStatsReceipt.js ***!
  \********************************************************/()=>{eval("// generate receipt pdf\nasync function generateReceiptPDF(printdata, settings) {\n  var _printdata$meta_data, _printdata$meta_data$;\n  const {\n    jsPDF\n  } = window.jspdf;\n  const doc = new jsPDF({\n    orientation: 'p',\n    unit: 'mm',\n    format: 'a4'\n  });\n  let yPosition = 20;\n  doc.setFontSize(8);\n  doc.setFont(\"Helvetica\", \"normal\");\n\n  // Add customer Header\n  let bPosition = yPosition;\n  if (printdata.billing) {\n    const billingFields = [{\n      condition: printdata.customer_id,\n      text: 'Customer ID: #' + printdata.customer_id\n    }, {\n      condition: printdata.billing.first_name || printdata.billing.last_name,\n      text: (printdata.billing.first_name || '') + ' ' + (printdata.billing.last_name || '')\n    }, {\n      condition: printdata.billing.email,\n      text: printdata.billing.email\n    }, {\n      condition: printdata.billing.phone,\n      text: 'Phone: ' + printdata.billing.phone\n    }, {\n      condition: printdata.billing.nif,\n      text: 'NIF: ' + printdata.billing.nif\n    }, {\n      condition: printdata.billing.address_1,\n      text: printdata.billing.address_1\n    }];\n\n    // Iterate over each field and print if it exists\n    billingFields.forEach(field => {\n      if (field.condition) {\n        yPosition += 5;\n        doc.text(field.text, 11, yPosition);\n      }\n    });\n  }\n\n  // Add company Header\n  if (settings.wepos_receipts && settings.wepos_receipts.receipt_header) {\n    const tempDiv = document.createElement('div');\n    tempDiv.innerHTML = settings.wepos_receipts.receipt_header.trim();\n    const companyInfo = Array.from(tempDiv.querySelectorAll('p')).map(p => p.textContent.trim());\n    if (companyInfo.length > 0) {\n      companyInfo.forEach(info => {\n        bPosition += 5;\n        doc.text(info, 198, bPosition, {\n          align: 'right'\n        });\n      });\n    }\n  }\n\n  // Add Order Info\n  yPosition = (yPosition < bPosition ? bPosition : yPosition) + 10;\n  doc.text(`Order ID: #${printdata.id}`, 11, yPosition);\n  doc.text(`Order Date: ${new Date(printdata.date_created).toLocaleString()}`, 198, yPosition, {\n    align: 'right'\n  });\n\n  // Divider\n  yPosition += 5;\n  doc.setLineDash([1, 1], 0);\n  doc.setLineWidth(0, 5);\n  doc.line(10, yPosition, 200, yPosition);\n  yPosition += 10;\n\n  // Add Line Items\n  doc.setFont(\"Helvetica\", \"bold\");\n  doc.text('Product', 11, yPosition);\n  doc.text('Quantity', 100, yPosition, {\n    align: 'center'\n  });\n  doc.text('Price', 198, yPosition, {\n    align: 'right'\n  });\n  const expiryData = (_printdata$meta_data = printdata.meta_data) === null || _printdata$meta_data === void 0 ? void 0 : (_printdata$meta_data$ = _printdata$meta_data.find(item => item.key === '_wepos_product_expiry_data')) === null || _printdata$meta_data$ === void 0 ? void 0 : _printdata$meta_data$.value;\n  printdata.line_items.forEach(item => {\n    var _expiryData$find;\n    yPosition += 5;\n    doc.setFont(\"Helvetica\", \"bold\");\n    doc.text(item.name, 11, yPosition);\n    doc.setFont(\"Helvetica\", \"normal\");\n    doc.text(`${item.quantity}`, 100, yPosition, {\n      align: 'center'\n    });\n    doc.text(formatPrice(item.subtotal), 198, yPosition, {\n      align: 'right'\n    });\n\n    // Add attributes\n    if (item.meta_data && item.meta_data.length > 0) {\n      yPosition += 2;\n      doc.setFontSize(7);\n      let previousWidth = 12;\n      item.meta_data.forEach(attribute_item => {\n        if (attribute_item.key.startsWith(\"pa_\")) {\n          // Set color for the display key\n          doc.setTextColor(117, 133, 152); // Gray color\n          doc.text(`${attribute_item.display_key}: `, previousWidth, yPosition, {\n            baseline: 'top'\n          });\n\n          // Get the width of the display key to set position for the value\n          const keyWidth = doc.getTextWidth(`${attribute_item.display_key}: `);\n\n          // Set color for the display value\n          doc.setTextColor(0, 0, 0); // Black color\n          doc.text(`${attribute_item.display_value}`, previousWidth + keyWidth, yPosition, {\n            baseline: 'top'\n          });\n          const valueWidth = doc.getTextWidth(`${attribute_item.display_value}: `);\n          previousWidth = previousWidth + keyWidth + valueWidth;\n        }\n      });\n    }\n\n    // Add Expiry\n    const expiry = expiryData === null || expiryData === void 0 ? void 0 : (_expiryData$find = expiryData.find(data => parseInt(data === null || data === void 0 ? void 0 : data.product_id) === parseInt(item === null || item === void 0 ? void 0 : item.product_id))) === null || _expiryData$find === void 0 ? void 0 : _expiryData$find.expiry;\n    if (expiry) {\n      yPosition += 7;\n      doc.setTextColor(117, 133, 152);\n      doc.text(`Expiry: `, 12, yPosition);\n      doc.setTextColor(0, 0, 0);\n      expiry.forEach(data => {\n        yPosition += 5;\n        doc.text(`${data.quantity}x ${data.date}`, 14, yPosition);\n      });\n    }\n    const itemTotal = parseFloat(item.total);\n    const itemSubtotal = parseFloat(item.subtotal);\n    const discount = itemSubtotal - itemTotal;\n    if (discount > 0) {\n      yPosition += 5;\n      doc.setTextColor(117, 133, 152);\n      doc.text(`Discount: -${formatPrice(discount.toFixed(2))}`, 12, yPosition);\n    }\n    doc.setTextColor(0, 0, 0);\n  });\n\n  // Add Subtotal\n  const total = parseFloat(printdata.total);\n  const discount = parseFloat(printdata.discount_total);\n  const subtotal = total + discount;\n  doc.setFont(\"Helvetica\", \"bold\");\n  doc.setFontSize(8);\n  yPosition += 10;\n  doc.text(`Subtotal:`, 11, yPosition);\n  doc.text(formatPrice(subtotal.toFixed(2)), 198, yPosition, {\n    align: 'right'\n  });\n\n  // Add Discounts, Fees, Tax, and Total\n  // Discount\n  if (printdata.coupon_lines && printdata.coupon_lines.length > 0) {\n    const fixedDiscount = printdata.coupon_lines.some(coupon => coupon.discount_type === \"fixed_product\");\n    yPosition += 5;\n    if (fixedDiscount) {\n      doc.text(`Discount:`, 11, yPosition);\n      doc.text(`-${formatPrice(printdata.discount_total)}`, 198, yPosition, {\n        align: 'right'\n      });\n      ;\n    } else {\n      printdata.coupon_lines.forEach(fee => {\n        doc.text(`Discount:`, 11, yPosition);\n        doc.text(`-${formatPrice(Math.abs(fee.discount))}`, 198, yPosition, {\n          align: 'right'\n        });\n      });\n    }\n  }\n\n  // Fees\n  if (printdata.fee_lines && printdata.fee_lines.length > 0) {\n    printdata.fee_lines.forEach(fee => {\n      yPosition += 5;\n      doc.text(`Fee:`, 11, yPosition);\n      doc.text(formatPrice(Math.abs(fee.fee)), 198, yPosition, {\n        align: 'right'\n      });\n    });\n  }\n\n  // Tax\n  if (printdata.total_tax > 0) {\n    yPosition += 5;\n    doc.text(`Tax:`, 11, yPosition);\n    doc.text(formatPrice(printdata.total_tax), 198, yPosition, {\n      align: 'right'\n    });\n  }\n\n  // Order Total\n  yPosition += 5;\n  doc.setFont(\"Helvetica\", \"bold\");\n  doc.text(`Order Total:`, 11, yPosition);\n  doc.text(formatPrice(printdata.total), 198, yPosition, {\n    align: 'right'\n  });\n\n  // Divider\n  yPosition += 10;\n  doc.setLineDash([1, 1], 0);\n  doc.setLineWidth(0, 5);\n  doc.line(10, yPosition, 200, yPosition);\n  yPosition += 10;\n\n  // Payment Method\n  doc.setFont(\"Helvetica\", \"normal\");\n  doc.text('Payment method:', 10, yPosition);\n  doc.text(printdata.payment_method_title || '', 198, yPosition, {\n    align: 'right'\n  });\n\n  // Payment Type\n  yPosition += 5;\n  doc.text('Payment Type:', 10, yPosition);\n  doc.text(printdata.meta_data.some(data => data.key === '_wepos_cash_payment_type' && data.value === 'partial') ? 'Partial Payment' : 'Full Payment', 198, yPosition, {\n    align: 'right'\n  });\n\n  // Payment Date\n  yPosition += 5;\n  doc.text('Payment Date:', 10, yPosition);\n  doc.text(formatDate(printdata.current_payment.date_created), 198, yPosition, {\n    align: 'right'\n  });\n\n  // total Paid/Due Amount\n  // Paid Amount\n  yPosition += 5;\n  doc.setFont(\"Helvetica\", \"bold\");\n  doc.text('Paid Amount:', 10, yPosition);\n  doc.text(formatPrice(parseFloat(printdata.current_payment.paid).toFixed(2)), 198, yPosition, {\n    align: 'right'\n  });\n\n  // past Payments stats\n  if (printdata.past_payment && printdata.past_payment.length > 0) {\n    // Divider\n    yPosition += 10;\n    doc.setLineDash([1, 1], 0);\n    doc.setLineWidth(0, 5);\n    doc.line(10, yPosition, 200, yPosition);\n    yPosition += 10;\n    doc.setFont(\"Helvetica\", \"bold\");\n    doc.text('Past Payments:', 11, yPosition);\n    doc.setFont(\"Helvetica\", \"normal\");\n    printdata.past_payment.forEach(payment => {\n      yPosition += 5;\n      doc.text(formatDate(payment.date_created), 13, yPosition);\n      doc.text(formatPrice(parseFloat(payment.paid).toFixed(2)), 198, yPosition, {\n        align: 'right'\n      });\n    });\n  }\n\n  // Divider\n  yPosition += 10;\n  doc.setLineDash([1, 1], 0);\n  doc.setLineWidth(0, 5);\n  doc.line(10, yPosition, 200, yPosition);\n  yPosition += 10;\n\n  // total Paid\n  doc.setFont(\"Helvetica\", \"bold\");\n  doc.text('Total Paid:', 10, yPosition);\n  doc.text(formatPrice(printdata.total_partial_paid), 198, yPosition, {\n    align: 'right'\n  });\n  if (printdata.payment_method === 'wepos_cash' && printdata.meta_data.some(data => data.key === '_wepos_cash_payment_type' && data.value === 'partial') && printdata.total_partial_due > 0) {\n    // total Due\n    yPosition += 5;\n    doc.text('Total Due:', 10, yPosition);\n    doc.text(formatPrice(printdata.total_partial_due), 198, yPosition, {\n      align: 'right'\n    });\n  }\n  if (printdata.total_partial_due <= 0) {\n    yPosition += 5;\n    doc.text('Payment Status:', 10, yPosition);\n    doc.text('Fully Paid', 198, yPosition, {\n      align: 'right'\n    });\n  }\n  yPosition += 25;\n  doc.setFont(\"Helvetica\", \"normal\");\n  doc.setLineDash([]);\n  doc.setLineWidth(0.2, 5);\n  doc.line(8, yPosition, 28, yPosition);\n  doc.text('Prepared by', 10, yPosition + 4, {\n    align: 'left'\n  });\n  doc.setFont(\"Helvetica\", \"normal\");\n  doc.setLineDash([]);\n  doc.setLineWidth(0.2, 5);\n  doc.line(90, yPosition, 110, yPosition);\n  doc.text('Delivered by', 100, yPosition + 4, {\n    align: 'center'\n  });\n  doc.setFont(\"Helvetica\", \"normal\");\n  doc.setLineDash([]);\n  doc.setLineWidth(0.2, 5);\n  doc.line(180, yPosition, 200, yPosition);\n  doc.text('Reviewed by', 198, yPosition + 4, {\n    align: 'right'\n  });\n\n  // Add Footer\n  if (settings.wepos_receipts && settings.wepos_receipts.receipt_footer) {\n    const pageSize = doc.internal.pageSize;\n    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();\n    const tempDiv = document.createElement('div');\n    tempDiv.innerHTML = settings.wepos_receipts.receipt_footer.trim();\n    const companyInfo = Array.from(tempDiv.querySelectorAll('p')).map(p => p.textContent.trim());\n    if (companyInfo.length > 0) {\n      companyInfo.forEach(info => {\n        doc.text(info, 100, pageHeight - 10, {\n          align: 'center'\n        });\n      });\n    }\n  }\n\n  // Open PDF in new tab\n  const pdfBlob = doc.output('blob');\n  const pdfUrl = URL.createObjectURL(pdfBlob);\n  window.open(pdfUrl);\n}\n\n// Format price\nfunction formatPrice(amount) {\n  return new Intl.NumberFormat('de-DE', {\n    style: 'currency',\n    currency: 'EUR'\n  }).format(amount);\n}\n\n// Convert WP format to DayJS format\nfunction formatDate(dateString) {\n  const date = new Date(dateString);\n\n  // Mapping of PHP to JavaScript Intl options\n  const options = {\n    'F j, Y': {\n      year: 'numeric',\n      month: 'long',\n      day: 'numeric'\n    },\n    // March 10, 2024\n    'Y-m-d': {\n      year: 'numeric',\n      month: '2-digit',\n      day: '2-digit'\n    },\n    // 2024-03-10\n    'm/d/Y': {\n      year: 'numeric',\n      month: '2-digit',\n      day: '2-digit'\n    },\n    // 03/10/2024\n    'd/m/Y': {\n      year: 'numeric',\n      month: '2-digit',\n      day: '2-digit'\n    },\n    // 10/03/2024\n    'M j, Y': {\n      year: 'numeric',\n      month: 'short',\n      day: 'numeric'\n    },\n    // Mar 10, 2024\n    'jS F Y': {},\n    // 10th March 2024 (custom handling needed)\n    'l, F j, Y': {},\n    // Sunday, March 10, 2024 (custom handling)\n    'D, M j, Y': {},\n    // Sun, Mar 10, 2024 (custom handling)\n    'g:i a': {\n      hour: 'numeric',\n      minute: 'numeric',\n      hour12: true\n    },\n    // 3:00 pm\n    'g:i A': {\n      hour: 'numeric',\n      minute: 'numeric',\n      hour12: true\n    },\n    // 3:00 PM\n    'H:i': {\n      hour: '2-digit',\n      minute: '2-digit',\n      hour12: false\n    },\n    // 15:00\n    'H:i:s': {\n      hour: '2-digit',\n      minute: '2-digit',\n      second: '2-digit',\n      hour12: false\n    } // 15:00:00\n  };\n\n  // Retrieve the desired format options\n  const formatOptions = options[partialPaymentData.dateFormat] || {\n    year: 'numeric',\n    month: 'long',\n    day: 'numeric'\n  };\n\n  // Use Intl.DateTimeFormat to format the date\n  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);\n}\n\n// Search by ID\nfunction searchByID(currentID, partialPaymentStats) {\n  // Find the object with the current ID\n  const currentItem = partialPaymentStats.find(item => parseInt(item.ID) === parseInt(currentID));\n  if (!currentItem) {\n    // Return an empty object if no matching ID is found\n    return {\n      currentPayment: null,\n      pastPayment: []\n    };\n  }\n\n  // Find all past items with IDs less than the current ID\n  const pastItems = partialPaymentStats.filter(item => parseInt(item.ID) < parseInt(currentID)).reverse();\n  return {\n    currentPayment: currentItem,\n    pastPayment: pastItems\n  };\n}\njQuery(document).ready(function ($) {\n  $('.partial-payment-stats').on('click', async function (e) {\n    var _partialReceipt$attr, _partialReceipt$attr2;\n    e.preventDefault();\n    if (!e.target.classList.contains('partial-receipt') && !e.target.parentNode.classList.contains('partial-receipt')) {\n      return;\n    }\n    let printData = {};\n    const partialReceipt = $(e.target.closest('.partial-receipt'));\n    const totalPartialPaid = parseFloat((_partialReceipt$attr = partialReceipt.attr('data-partial-paid')) !== null && _partialReceipt$attr !== void 0 ? _partialReceipt$attr : 0).toFixed(2);\n    const totalPartialDue = parseFloat((_partialReceipt$attr2 = partialReceipt.attr('data-partial-due')) !== null && _partialReceipt$attr2 !== void 0 ? _partialReceipt$attr2 : 0).toFixed(2);\n    const partialPaymentId = partialReceipt.attr('data-partial-payment-id');\n    const {\n      currentPayment,\n      pastPayment\n    } = searchByID(partialPaymentId, partialPaymentData.partialPaymentStats);\n    try {\n      printData = await $.ajax({\n        type: 'POST',\n        url: `${weposData.orderUrl}/${partialPaymentData.orderId}`,\n        beforeSend: function (xhr) {\n          xhr.setRequestHeader('X-WP-Nonce', weposData.nonce); // Set nonce header for security\n        }\n      });\n      printData.total_partial_paid = totalPartialPaid;\n      printData.total_partial_due = totalPartialDue;\n      printData.current_payment = currentPayment;\n      printData.past_payment = pastPayment;\n      const parser = new DOMParser(),\n        dom = parser.parseFromString(partialPaymentData.settings.wepos_receipts.receipt_header, \"text/html\");\n      await generateReceiptPDF(printData, partialPaymentData.settings);\n    } catch (error) {\n      console.log(error);\n    }\n  });\n});\n\n//# sourceURL=webpack://wepos/./assets/src/utils/partialPaymentStatsReceipt.js?")}},__webpack_exports__={};__webpack_modules__["./assets/src/utils/partialPaymentStatsReceipt.js"]()})();