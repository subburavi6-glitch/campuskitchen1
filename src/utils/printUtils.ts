// Print utility functions for generating formatted print documents

export const generatePrintHTML = (data: any, type: 'indent' | 'po' | 'grn') => {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  const commonStyles = `
    <style>
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 20px; 
        line-height: 1.4;
      }
      .header { 
        text-align: center; 
        margin-bottom: 30px; 
        border-bottom: 3px solid #1c3c80; 
        padding-bottom: 20px; 
      }
      .logo { 
        font-size: 28px; 
        font-weight: bold; 
        color: #1c3c80; 
        margin-bottom: 5px;
      }
      .subtitle { 
        font-size: 18px; 
        color: #666; 
        margin-bottom: 10px;
      }
      .document-title {
        font-size: 24px;
        font-weight: bold;
        color: #1c3c80;
        margin: 10px 0;
      }
      .details { 
        margin: 20px 0; 
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .detail-item {
        margin-bottom: 10px;
      }
      .detail-label {
        font-weight: bold;
        color: #333;
      }
      .table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 20px 0; 
        font-size: 14px;
      }
      .table th, .table td { 
        border: 1px solid #ddd; 
        padding: 12px 8px; 
        text-align: left; 
      }
      .table th { 
        background-color: #f8f9fa; 
        font-weight: bold;
        color: #1c3c80;
      }
      .table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      .footer { 
        margin-top: 50px; 
        page-break-inside: avoid;
      }
      .signature-section {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 40px;
        margin-top: 60px;
      }
      .signature-box {
        text-align: center;
        border-top: 1px solid #333;
        padding-top: 10px;
      }
      .total-section {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin-top: 20px;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .status-pending { background-color: #fff3cd; color: #856404; }
      .status-approved { background-color: #d4edda; color: #155724; }
      .status-sent { background-color: #d1ecf1; color: #0c5460; }
      @media print {
        body { margin: 0; }
        .no-print { display: none; }
      }
    </style>
  `;

  if (type === 'indent') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Indent Request - ${data.meal}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <div class="logo">FOOD SERVICE MANAGEMENT SYSTEM</div>
          <div class="subtitle">Campus Kitchen Operations</div>
          <div class="document-title">INDENT REQUEST</div>
        </div>
        
        <div class="details">
          <div>
            <div class="detail-item">
              <span class="detail-label">Meal Type:</span> ${data.meal}
            </div>
            <div class="detail-item">
              <span class="detail-label">Requested For:</span> ${new Date(data.requestedForDate).toLocaleDateString()}
            </div>
            <div class="detail-item">
              <span class="detail-label">Requested By:</span> ${data.requester.name}
            </div>
            <div class="detail-item">
              <span class="detail-label">Request Date:</span> ${new Date(data.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div class="detail-item">
              <span class="detail-label">Status:</span> 
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Total Items:</span> ${data.items.length}
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Date:</span> ${currentDate}
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Time:</span> ${currentTime}
            </div>
          </div>
        </div>

        ${data.notes ? `
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <strong>Notes:</strong> ${data.notes}
          </div>
        ` : ''}

        <table class="table">
          <thead>
            <tr>
              <th style="width: 40%">Item Name</th>
              <th style="width: 10%">Unit</th>
              <th style="width: 15%">Requested Qty</th>
              <th style="width: 15%">Approved Qty</th>
              <th style="width: 20%">Estimated Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td>${item.item.name}</td>
                <td>${typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}</td>
                <td style="text-align: right">${item.requestedQty}</td>
                <td style="text-align: right">${item.approvedQty || '-'}</td>
                <td style="text-align: right">₹${item.estimatedCost}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div style="text-align: right; font-size: 18px;">
            <strong>Total Estimated Cost: ₹${data.totalCost}</strong>
          </div>
        </div>

        <div class="footer">
          <div class="signature-section">
            <div class="signature-box">
              <div>Requested By</div>
              <div style="margin-top: 40px; font-weight: bold;">${data.requester.name}</div>
            </div>
            <div class="signature-box">
              <div>Approved By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
            <div class="signature-box">
              <div>Authorized By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'po') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${data.poNo}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <div class="logo">FOOD SERVICE MANAGEMENT SYSTEM</div>
          <div class="subtitle">Purchase Department</div>
          <div class="document-title">PURCHASE ORDER</div>
        </div>
        
        <div class="details">
          <div>
            <div class="detail-item">
              <span class="detail-label">PO Number:</span> ${data.poNo}
            </div>
            <div class="detail-item">
              <span class="detail-label">Vendor:</span> ${data.vendor.name}
            </div>
            <div class="detail-item">
              <span class="detail-label">Created By:</span> ${data.creator.name}
            </div>
            <div class="detail-item">
              <span class="detail-label">PO Date:</span> ${new Date(data.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div class="detail-item">
              <span class="detail-label">Status:</span> 
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Date:</span> ${currentDate}
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Time:</span> ${currentTime}
            </div>
          </div>
        </div>

        <div style="margin: 20px 0;">
          <h3>Vendor Details:</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> ${data.vendor.name}</p>
            <p><strong>GST No:</strong> ${data.vendor.gstNo || 'N/A'}</p>
            <p><strong>Phone:</strong> ${data.vendor.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${data.vendor.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${data.vendor.address || 'N/A'}</p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 40%">Item Name</th>
              <th style="width: 10%">Unit</th>
              <th style="width: 15%">Ordered Qty</th>
              <th style="width: 15%">Unit Cost (₹)</th>
              <th style="width: 10%">Tax %</th>
              <th style="width: 10%">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td>${item.item.name}</td>
                <td>${typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}</td>
                <td style="text-align: right">${item.orderedQty}</td>
                <td style="text-align: right">₹${item.unitCost}</td>
                <td style="text-align: right">${item.taxRate}%</td>
                <td style="text-align: right">₹${(parseFloat(item.orderedQty) * parseFloat(item.unitCost)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div style="text-align: right;">
            <div style="margin-bottom: 5px;">Subtotal: ₹${data.subtotal}</div>
            <div style="margin-bottom: 5px;">Tax: ₹${data.tax}</div>
            <div style="font-size: 20px; font-weight: bold; border-top: 2px solid #1c3c80; padding-top: 10px;">
              Total: ₹${data.total}
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="signature-section">
            <div class="signature-box">
              <div>Prepared By</div>
              <div style="margin-top: 40px; font-weight: bold;">${data.creator.name}</div>
            </div>
            <div class="signature-box">
              <div>Approved By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
            <div class="signature-box">
              <div>Authorized By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'grn') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Goods Receipt Note - ${data.grnNo}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <div class="logo">FOOD SERVICE MANAGEMENT SYSTEM</div>
          <div class="subtitle">Goods Receipt Department</div>
          <div class="document-title">GOODS RECEIPT NOTE</div>
        </div>
        
        <div class="details">
          <div>
            <div class="detail-item">
              <span class="detail-label">GRN Number:</span> ${data.grnNo}
            </div>
            <div class="detail-item">
              <span class="detail-label">PO Number:</span> ${data.po.poNo}
            </div>
            <div class="detail-item">
              <span class="detail-label">Vendor:</span> ${data.po.vendor.name}
            </div>
            <div class="detail-item">
              <span class="detail-label">Invoice No:</span> ${data.invoiceNo || 'N/A'}
            </div>
          </div>
          <div>
            <div class="detail-item">
              <span class="detail-label">Received Date:</span> ${new Date(data.receivedAt).toLocaleDateString()}
            </div>
            <div class="detail-item">
              <span class="detail-label">Received By:</span> ${data.receiver.name}
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Date:</span> ${currentDate}
            </div>
            <div class="detail-item">
              <span class="detail-label">Print Time:</span> ${currentTime}
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 30%">Item Name</th>
              <th style="width: 15%">Batch No</th>
              <th style="width: 15%">Received Qty</th>
              <th style="width: 15%">Unit Cost (₹)</th>
              <th style="width: 15%">Total (₹)</th>
              <th style="width: 10%">✓ Received</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td>${item.item.name}</td>
                <td>${item.batchNo}</td>
                <td style="text-align: right">${item.receivedQty} ${typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}</td>
                <td style="text-align: right">₹${item.unitCost.toFixed(2)}</td>
                <td style="text-align: right">₹${(item.receivedQty * item.unitCost).toFixed(2)}</td>
                <td style="text-align: center; font-size: 18px;">✓</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div style="text-align: right; font-size: 18px;">
            <strong>Total Value: ₹${data.items.reduce((sum: number, item: any) => sum + (item.receivedQty * item.unitCost), 0).toFixed(2)}</strong>
          </div>
          <div style="margin-top: 10px; color: #28a745; font-weight: bold; text-align: center;">
            ✓ ALL ITEMS RECEIVED AND VERIFIED
          </div>
        </div>

        ${data.notes ? `
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <strong>Notes:</strong> ${data.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="signature-section">
            <div class="signature-box">
              <div>Received By</div>
              <div style="margin-top: 40px; font-weight: bold;">${data.receiver.name}</div>
            </div>
            <div class="signature-box">
              <div>Quality Checked By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
            <div class="signature-box">
              <div>Authorized By</div>
              <div style="margin-top: 40px;">_________________</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  return '';
};

export const printDocument = async (api: any, endpoint: string, type: 'indent' | 'po' | 'grn') => {
  try {
    const response = await api.get(endpoint);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(response.data, type));
      printWindow.document.close();
      printWindow.print();
    }
  } catch (error) {
    console.error(`Failed to print ${type}:`, error);
    throw error;
  }
};