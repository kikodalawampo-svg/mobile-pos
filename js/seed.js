/* ==========================================================================
   seed.js — Sample/demo data, clearly tagged with sample:true for easy removal
   ========================================================================== */

const Seed = {
  async seedIfEmpty() {
    const customers = await DB.getAll('customers');
    if (customers.length > 0) return; // already has data, never overwrite

    const now = Utils.nowISO();

    const tech1 = { id: Utils.uid('tech_'), name: 'Mark Santos', active: true, sample: true, createdAt: now };
    const tech2 = { id: Utils.uid('tech_'), name: 'Ana Reyes', active: true, sample: true, createdAt: now };
    await DB.add('technicians', tech1);
    await DB.add('technicians', tech2);

    const supp1 = { id: Utils.uid('supp_'), name: 'CebuParts Trading', contact: '0917-000-1111', address: 'Cebu City', notes: '', sample: true, createdAt: now };
    await DB.add('suppliers', supp1);

    const part1 = { id: Utils.uid('part_'), name: 'LCD Screen', compatibleModel: 'Samsung Galaxy A14', supplierId: supp1.id, supplierName: supp1.name, quantity: 8, cost: 900, sellingPrice: 1500, notes: '', sample: true, dateAdded: now };
    const part2 = { id: Utils.uid('part_'), name: 'Battery', compatibleModel: 'iPhone 11', supplierId: supp1.id, supplierName: supp1.name, quantity: 12, cost: 450, sellingPrice: 900, notes: '', sample: true, dateAdded: now };
    const part3 = { id: Utils.uid('part_'), name: 'Charging Port Flex', compatibleModel: 'Universal Android', supplierId: supp1.id, supplierName: supp1.name, quantity: 15, cost: 150, sellingPrice: 350, notes: '', sample: true, dateAdded: now };
    await DB.add('parts', part1);
    await DB.add('parts', part2);
    await DB.add('parts', part3);

    const cust1 = { id: Utils.uid('cust_'), name: 'Juan Dela Cruz', mobile: '0917-123-4567', address: 'Lucena City', notes: 'Sample customer', sample: true, createdAt: now };
    const cust2 = { id: Utils.uid('cust_'), name: 'Maria Santos', mobile: '0928-555-7890', address: 'Lucena City', notes: 'Sample customer', sample: true, createdAt: now };
    await DB.add('customers', cust1);
    await DB.add('customers', cust2);

    // Sample job order #1 — fully paid, released
    const jo1Total = 1800;
    const jo1 = {
      id: Utils.uid('job_'),
      jobOrderNumber: await Utils.nextJobOrderNumber(),
      customerId: cust1.id, customerName: cust1.name, customerMobile: cust1.mobile,
      deviceBrand: 'Samsung', deviceModel: 'Galaxy A14', imei: '356789012345678',
      deviceColor: 'Black', deviceCondition: 'Cracked screen', accessories: 'None',
      reportedProblem: 'Screen cracked, touch not responding', diagnosis: 'LCD assembly damaged',
      jobDescription: 'Replace LCD', technicianId: tech1.id, technicianName: tech1.name,
      supplierId: supp1.id, supplierName: supp1.name,
      partsUsed: [{ partId: part1.id, name: part1.name, quantity: 1, unitCost: part1.cost, unitCharge: part1.sellingPrice }],
      laborCost: 200, laborCharge: 300, discount: 0,
      totalAmount: jo1Total, amountPaid: jo1Total, paymentStatus: 'Fully Paid',
      status: 'Released',
      statusHistory: [
        { status: 'Pending', at: now }, { status: 'In Progress', at: now },
        { status: 'Done', at: now }, { status: 'Released', at: now }
      ],
      createdAt: now, updatedAt: now, releasedAt: now, releasedBy: 'Sample Data',
      sample: true
    };
    await DB.add('jobOrders', jo1);
    await DB.add('payments', {
      id: Utils.uid('pay_'), jobOrderId: jo1.id, jobOrderNumber: jo1.jobOrderNumber, customerName: jo1.customerName,
      amount: jo1Total, method: 'Cash', notes: 'Sample payment', recordedBy: 'Sample Data', date: now,
      previousBalance: jo1Total, newBalance: 0, sample: true
    });

    // Sample job order #2 — partially paid, in progress
    const jo2Total = 950;
    const jo2Paid = 400;
    const jo2 = {
      id: Utils.uid('job_'),
      jobOrderNumber: await Utils.nextJobOrderNumber(),
      customerId: cust2.id, customerName: cust2.name, customerMobile: cust2.mobile,
      deviceBrand: 'iPhone', deviceModel: '11', imei: '351234567890123',
      deviceColor: 'White', deviceCondition: 'Battery drains fast', accessories: 'SIM card',
      reportedProblem: 'Battery drains fast, phone shuts down at 20%', diagnosis: 'Battery health degraded',
      jobDescription: 'Battery replacement', technicianId: tech2.id, technicianName: tech2.name,
      supplierId: supp1.id, supplierName: supp1.name,
      partsUsed: [{ partId: part2.id, name: part2.name, quantity: 1, unitCost: part2.cost, unitCharge: part2.sellingPrice }],
      laborCost: 50, laborCharge: 50, discount: 0,
      totalAmount: jo2Total, amountPaid: jo2Paid, paymentStatus: 'Partially Paid',
      status: 'In Progress',
      statusHistory: [{ status: 'Pending', at: now }, { status: 'In Progress', at: now }],
      createdAt: now, updatedAt: now, releasedAt: null, releasedBy: '',
      sample: true
    };
    await DB.add('jobOrders', jo2);
    await DB.add('payments', {
      id: Utils.uid('pay_'), jobOrderId: jo2.id, jobOrderNumber: jo2.jobOrderNumber, customerName: jo2.customerName,
      amount: jo2Paid, method: 'GCash', notes: 'Down payment (sample)', recordedBy: 'Sample Data', date: now,
      previousBalance: jo2Total, newBalance: jo2Total - jo2Paid, sample: true
    });

    // Sample job order #3 — pending, waiting for parts
    const jo3 = {
      id: Utils.uid('job_'),
      jobOrderNumber: await Utils.nextJobOrderNumber(),
      customerId: cust1.id, customerName: cust1.name, customerMobile: cust1.mobile,
      deviceBrand: 'Xiaomi', deviceModel: 'Redmi 10', imei: '359876543210987',
      deviceColor: 'Blue', deviceCondition: 'No power', accessories: 'None',
      reportedProblem: 'Phone does not turn on', diagnosis: 'Charging port needs replacement — awaiting stock',
      jobDescription: 'Charging port repair', technicianId: tech1.id, technicianName: tech1.name,
      supplierId: '', supplierName: '',
      partsUsed: [],
      laborCost: 0, laborCharge: 0, discount: 0,
      totalAmount: 500, amountPaid: 0, paymentStatus: 'Balance Due',
      status: 'Waiting for Parts',
      statusHistory: [{ status: 'Pending', at: now }, { status: 'Waiting for Parts', at: now }],
      createdAt: now, updatedAt: now, releasedAt: null, releasedBy: '',
      sample: true
    };
    await DB.add('jobOrders', jo3);

    await Utils.logActivity('Sample data loaded');
  },

  async removeSampleData() {
    for (const name of DB.storeNames()) {
      if (name === 'settings') continue;
      const all = await DB.getAll(name);
      for (const rec of all) {
        if (rec.sample) await DB.delete(name, rec.id);
      }
    }
  }
};

window.Seed = Seed;
