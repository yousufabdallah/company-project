import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const OMR = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  console.log("Seeding Auto Workshop SaaS...");

  // Wipe
  await db.auditLog.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.jobCardPart.deleteMany();
  await db.jobCardService.deleteMany();
  await db.jobCard.deleteMany();
  await db.estimateItem.deleteMany();
  await db.estimate.deleteMany();
  await db.vehicleInspection.deleteMany();
  await db.appointment.deleteMany();
  await db.vehicle.deleteMany();
  await db.purchaseItem.deleteMany();
  await db.purchase.deleteMany();
  await db.stockMovement.deleteMany();
  await db.part.deleteMany();
  await db.warranty.deleteMany();
  await db.expense.deleteMany();
  await db.service.deleteMany();
  await db.category.deleteMany();
  await db.supplier.deleteMany();
  await db.warehouse.deleteMany();
  await db.customer.deleteMany();
  await db.branch.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();

  // ─── Tenant ───────────────────────────────────────────────
  const tenant = await db.tenant.create({
    data: {
      name: "Al-Manara Auto Service",
      address: "Way 3815, Building 142, Seeb, Muscat, Oman",
      phone: "+968 2456 7890",
      whatsapp: "+968 9123 4567",
      email: "info@almanara-auto.om",
      crNumber: "CR-1234567",
      taxNumber: "VAT-OM-9876543",
      currency: "OMR",
      taxPercent: 5,
      invoicePrefix: "INV-",
      jobCardPrefix: "JC-",
      estimatePrefix: "EST-",
      workingHours: "Sat–Thu, 8:00 AM – 6:00 PM",
      invoiceFooter: "Thank you for trusting Al-Manara Auto Service. Parts carry 90-day warranty unless stated otherwise.",
      terms: "1. Estimates valid for 7 days. 2. Vehicles must be collected within 14 days of completion. 3. Unclaimed vehicles after 30 days incur storage fees of 1.000 OMR/day.",
      status: "active",
      plan: "Professional",
    },
  });

  // ─── Users ───────────────────────────────────────────────
  const mkUser = (name: string, email: string, role: string, phone?: string) =>
    db.user.create({ data: { tenantId: tenant.id, name, email, password: "demo1234", role, phone, active: true } });

  const owner = await mkUser("Khalid Al-Rashidi", "owner@almanara.om", "owner", "+968 9111 0001");
  const manager = await mkUser("Sami Al-Balushi", "manager@almanara.om", "manager", "+968 9111 0002");
  const advisor = await mkUser("Yousef Al-Hinai", "advisor@almanara.om", "advisor", "+968 9111 0003");
  const tech = await mkUser("Ahmed Al-Maawali", "tech@almanara.om", "technician", "+968 9111 0004");
  const tech2 = await mkUser("Mohanad Said", "tech2@almanara.om", "technician", "+968 9111 0005");
  const accountant = await mkUser("Fatima Al-Zadjali", "accounts@almanara.om", "accountant", "+968 9111 0006");
  const inv = await mkUser("Omar Al-Jabri", "inventory@almanara.om", "inventory", "+968 9111 0007");

  // ─── Branches & Warehouses ───────────────────────────────
  const mainBranch = await db.branch.create({ data: { tenantId: tenant.id, name: "Main Branch — Seeb", address: "Seeb, Muscat", phone: "+968 2456 7890", managerId: manager.id } });
  const branch2 = await db.branch.create({ data: { tenantId: tenant.id, name: "Branch 2 — Ruwi", address: "Ruwi, Muscat", phone: "+968 2456 7891" } });

  const whMain = await db.warehouse.create({ data: { tenantId: tenant.id, name: "Main Warehouse", branchId: mainBranch.id, location: "Store A" } });
  const whParts = await db.warehouse.create({ data: { tenantId: tenant.id, name: "Parts Store", branchId: mainBranch.id, location: "Store B" } });
  await db.warehouse.create({ data: { tenantId: tenant.id, name: "Ruwi Warehouse", branchId: branch2.id, location: "Store C" } });

  // ─── Categories ───────────────────────────────────────────
  const catEngine = await db.category.create({ data: { tenantId: tenant.id, name: "Engine Parts", type: "part" } });
  const catBrakes = await db.category.create({ data: { tenantId: tenant.id, name: "Brakes", type: "part" } });
  const catFilter = await db.category.create({ data: { tenantId: tenant.id, name: "Filters & Fluids", type: "part" } });
  const catElec = await db.category.create({ data: { tenantId: tenant.id, name: "Electrical", type: "part" } });
  const catSusp = await db.category.create({ data: { tenantId: tenant.id, name: "Suspension", type: "part" } });

  // ─── Suppliers ───────────────────────────────────────────
  const sup1 = await db.supplier.create({ data: { tenantId: tenant.id, name: "Gulf Auto Parts Co.", company: "Gulf Auto Parts LLC", phone: "+968 2321 1111", whatsapp: "+968 9222 1111", email: "sales@gulfparts.om", address: "Industrial Area, Muscat", taxNumber: "VAT-G-1111", paymentTerms: "Net 30", balance: 0 } });
  const sup2 = await db.supplier.create({ data: { tenantId: tenant.id, name: "Oman Battery Center", company: "OBC LLC", phone: "+968 2321 2222", whatsapp: "+968 9222 2222", email: "info@omanbattery.om", address: "Ruwi, Muscat", taxNumber: "VAT-O-2222", paymentTerms: "Net 15", balance: 0 } });
  const sup3 = await db.supplier.create({ data: { tenantId: tenant.id, name: "Al-Bilad Tires", company: "Bilad Tires LLC", phone: "+968 2321 3333", whatsapp: "+968 9222 3333", email: "orders@biladtires.om", address: "Sohar", paymentTerms: "COD", balance: 0 } });

  // ─── Parts ──────────────────────────────────────────────
  const parts = [
    { sku: "OIL-5W30-4L", name: "Engine Oil 5W-30 4L", nameAr: "زيت محرك 5W-30 4 لتر", cat: catFilter, brand: "Mobil 1", supplier: sup1, cost: 12.5, sell: 18.0, qty: 40, min: 10 },
    { sku: "OIL-FILT-T20", name: "Oil Filter Toyota T20", nameAr: "فلتر زيت تويوتا T20", cat: catFilter, brand: "Bosch", supplier: sup1, cost: 3.0, sell: 6.5, qty: 60, min: 15 },
    { sku: "AIR-FILT-T20", name: "Air Filter Toyota T20", nameAr: "فلتر هواء تويوتا T20", cat: catFilter, brand: "Bosch", supplier: sup1, cost: 4.0, sell: 8.0, qty: 8, min: 12 },
    { sku: "BRAKE-PAD-FR", name: "Front Brake Pad Set", nameAr: "طقم فحمات أمامية", cat: catBrakes, brand: "Brembo", supplier: sup1, cost: 22.0, sell: 38.0, qty: 25, min: 8 },
    { sku: "BRAKE-DISC-FR", name: "Front Brake Disc", nameAr: "قرص فرامل أمامي", cat: catBrakes, brand: "Brembo", supplier: sup1, cost: 28.0, sell: 48.0, qty: 4, min: 6 },
    { sku: "BATT-70AH", name: "Battery 70Ah", nameAr: "بطارية 70 أمبير", cat: catElec, brand: "ACDelco", supplier: sup2, cost: 45.0, sell: 75.0, qty: 12, min: 5 },
    { sku: "TIRE-205-55-16", name: "Tire 205/55 R16", nameAr: "إطار 205/55 R16", cat: catSusp, brand: "Michelin", supplier: sup3, cost: 35.0, sell: 58.0, qty: 32, min: 8 },
    { sku: "SPARK-NGK", name: "Spark Plug NGK Iridium", nameAr: "بواجي NGK إيريديوم", cat: catEngine, brand: "NGK", supplier: sup1, cost: 4.5, sell: 9.0, qty: 3, min: 8 },
    { sku: "COOLANT-2L", name: "Coolant 2L", nameAr: "سائل تبريد 2 لتر", cat: catFilter, brand: "Prestone", supplier: sup1, cost: 3.5, sell: 7.0, qty: 30, min: 10 },
    { sku: "WIPER-BLADE", name: "Wiper Blade Pair", nameAr: "طقم مساحات", cat: catElec, brand: "Bosch", supplier: sup1, cost: 5.0, sell: 11.0, qty: 20, min: 8 },
  ];
  const partRecs = [];
  for (const p of parts) {
    const rec = await db.part.create({ data: { tenantId: tenant.id, sku: p.sku, barcode: "629" + Math.floor(1000000 + Math.random() * 8999999), name: p.name, nameAr: p.nameAr, categoryId: p.cat.id, brand: p.brand, supplierId: p.supplier.id, costPrice: p.cost, sellingPrice: p.sell, quantity: p.qty, minStock: p.min, maxStock: 100, location: "Shelf-" + p.sku.slice(0, 4), warrantyMonths: 6 } });
    partRecs.push(rec);
    await db.stockMovement.create({ data: { tenantId: tenant.id, partId: rec.id, warehouseId: whMain.id, type: "in", quantity: p.qty, refType: "opening", note: "Opening stock", createdBy: inv.id } });
  }

  // ─── Services ───────────────────────────────────────────
  const services = [
    { code: "OIL-CHG", name: "Oil & Filter Change", dur: 0.5, labor: 5.0, price: 8.0, war: 0 },
    { code: "BRK-SRV", name: "Brake Service (Front)", dur: 1.5, labor: 12.0, price: 18.0, war: 3 },
    { code: "AC-SRV", name: "AC Service & Recharge", dur: 2.0, labor: 15.0, price: 25.0, war: 6 },
    { code: "ENG-MAJ", name: "Engine Major Repair", dur: 12.0, labor: 120.0, price: 180.0, war: 12 },
    { code: "ELE-DIA", name: "Electrical Diagnostics", dur: 1.0, labor: 8.0, price: 15.0, war: 0 },
    { code: "SUS-SRV", name: "Suspension Service", dur: 3.0, labor: 22.0, price: 32.0, war: 3 },
    { code: "TIR-REP", name: "Tire Replacement (4)", dur: 1.0, labor: 8.0, price: 12.0, war: 0 },
    { code: "BAT-REP", name: "Battery Replacement", dur: 0.3, labor: 3.0, price: 5.0, war: 12 },
  ];
  const serviceRecs = [];
  for (const s of services) {
    serviceRecs.push(await db.service.create({ data: { tenantId: tenant.id, code: s.code, name: s.name, description: s.name + " service", durationHours: s.dur, laborCost: s.labor, price: s.price, warrantyMonths: s.war } }));
  }

  // ─── Customers & Vehicles ───────────────────────────────
  const custData = [
    { name: "Mohammed Al-Hashimi", mobile: "+968 9333 1010", type: "individual", vehicles: [{ plate: "12345-B", make: "Toyota", model: "Camry", year: 2019, color: "Silver", fuel: "Petrol", mileage: 85400, vin: "JT2BG22K0W0123456" }, { plate: "98765-C", make: "Nissan", model: "Altima", year: 2021, color: "White", fuel: "Petrol", mileage: 41200, vin: "1N4BL4EC0FN123456" }] },
    { name: "Aisha Al-Siyabi", mobile: "+968 9333 2020", type: "individual", vehicles: [{ plate: "55412-A", make: "Honda", model: "Accord", year: 2020, color: "Black", fuel: "Petrol", mileage: 60300, vin: "1HGCT2F88FA012345" }] },
    { name: "Nasser Trading LLC", mobile: "+968 9333 3030", type: "corporate", vehicles: [{ plate: "TRD-001", make: "Mitsubishi", model: "L200", year: 2022, color: "Red", fuel: "Diesel", mileage: 52800, vin: "MMALNKK60P0012345" }, { plate: "TRD-002", make: "Isuzu", model: "NPR", year: 2021, color: "White", fuel: "Diesel", mileage: 98100, vin: "JALC4V16477001234" }] },
    { name: "Salim Al-Mahrouqi", mobile: "+968 9333 4040", type: "individual", vehicles: [{ plate: "77889-D", make: "Hyundai", model: "Sonata", year: 2018, color: "Grey", fuel: "Petrol", mileage: 110500, vin: "KMHL34JA8JA012345" }] },
    { name: "Huda Al-Kharusi", mobile: "+968 9333 5050", type: "individual", vehicles: [{ plate: "33214-A", make: "Kia", model: "Sportage", year: 2022, color: "Blue", fuel: "Petrol", mileage: 28900, vin: "KNDP8CAC2N7012345" }] },
    { name: "Falcon Transport Co.", mobile: "+968 9333 6060", type: "corporate", vehicles: [{ plate: "FLC-010", make: "Toyota", model: "Hiace", year: 2023, color: "White", fuel: "Diesel", mileage: 19400, vin: "JTFKC22P3N0001234" }] },
  ];
  const customers = [];
  const allVehicles = [];
  let custSeq = 1;
  for (const c of custData) {
    const cust = await db.customer.create({ data: { tenantId: tenant.id, code: "CUST-" + String(custSeq).padStart(4, "0"), name: c.name, mobile: c.mobile, whatsapp: c.mobile, email: c.name.toLowerCase().replace(/[^a-z]/g, "") + "@mail.om", address: "Muscat, Oman", type: c.type, balance: 0 } });
    customers.push(cust);
    custSeq++;
    for (const v of c.vehicles) {
      const veh = await db.vehicle.create({ data: { tenantId: tenant.id, customerId: cust.id, plateNumber: v.plate, vin: v.vin, make: v.make, model: v.model, year: v.year, color: v.color, fuelType: v.fuel, transmission: "Automatic", mileage: v.mileage } });
      allVehicles.push({ veh, cust });
    }
  }

  // ─── Appointments (today + a few) ───────────────────────
  const today = new Date();
  const mkDate = (dayOffset: number, h: number, m: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  await db.appointment.create({ data: { tenantId: tenant.id, customerId: customers[0].id, vehicleId: allVehicles[0].veh.id, serviceId: serviceRecs[0].id, date: mkDate(0, 9, 0), time: "09:00", technicianId: tech.id, status: "arrived", notes: "Customer waiting" } });
  await db.appointment.create({ data: { tenantId: tenant.id, customerId: customers[1].id, vehicleId: allVehicles[2].veh.id, serviceId: serviceRecs[2].id, date: mkDate(0, 10, 30), time: "10:30", technicianId: tech2.id, status: "confirmed", notes: "AC not cooling" } });
  await db.appointment.create({ data: { tenantId: tenant.id, customerId: customers[3].id, vehicleId: allVehicles[4].veh.id, serviceId: serviceRecs[1].id, date: mkDate(0, 13, 0), time: "13:00", technicianId: tech.id, status: "scheduled", notes: "Brake noise" } });
  await db.appointment.create({ data: { tenantId: tenant.id, customerId: customers[4].id, vehicleId: allVehicles[5].veh.id, serviceId: serviceRecs[6].id, date: mkDate(0, 15, 0), time: "15:00", technicianId: tech2.id, status: "scheduled", notes: "Tire replacement x4" } });
  await db.appointment.create({ data: { tenantId: tenant.id, customerId: customers[2].id, vehicleId: allVehicles[3].veh.id, serviceId: serviceRecs[5].id, date: mkDate(1, 9, 0), time: "09:00", technicianId: tech.id, status: "scheduled", notes: "Suspension check" } });

  // ─── Job Cards (various statuses) ───────────────────────
  const statuses = ["draft", "waiting_approval", "approved", "in_progress", "waiting_parts", "waiting_customer", "quality_check", "completed", "ready_for_delivery", "delivered"];
  const jcScenarios = [
    { cust: 0, veh: 0, svc: 0, parts: [0, 1], status: "in_progress", complaint: "Engine oil change + check noise" },
    { cust: 1, veh: 2, svc: 2, parts: [], status: "approved", complaint: "AC not cooling properly" },
    { cust: 3, veh: 4, svc: 1, parts: [3, 4], status: "waiting_parts", complaint: "Brake grinding noise, low pedal" },
    { cust: 4, veh: 5, svc: 6, parts: [6], status: "ready_for_delivery", complaint: "All four tires worn out, replace" },
    { cust: 2, veh: 3, svc: 5, parts: [], status: "completed", complaint: "Suspension clunking over bumps" },
    { cust: 0, veh: 1, svc: 4, parts: [], status: "draft", complaint: "Battery drain, won't start" },
    { cust: 5, veh: 6, svc: 3, parts: [], status: "waiting_customer", complaint: "Engine overheating, needs head gasket" },
  ];
  let jcSeq = 1;
  for (const sc of jcScenarios) {
    const cust = customers[sc.cust];
    const veh = allVehicles.find((v) => v.cust.id === cust.id && (sc.veh < allVehicles.length))!.veh;
    const sv = serviceRecs[sc.svc];
    const partsUsed = sc.parts.map((i) => partRecs[i]);
    const laborTotal = sv.price;
    const partsTotal = partsUsed.reduce((s, p) => s + p.sellingPrice, 0);
    const subtotal = laborTotal + partsTotal;
    const discount = 0;
    const tax = OMR(((subtotal - discount) * tenant.taxPercent) / 100);
    const grand = OMR(subtotal - discount + tax);
    const jc = await db.jobCard.create({
      data: {
        tenantId: tenant.id,
        code: "JC-" + String(jcSeq).padStart(5, "0"),
        customerId: cust.id,
        vehicleId: veh.id,
        mileage: veh.mileage,
        complaint: sc.complaint,
        diagnosis: sc.status === "completed" || sc.status === "ready_for_delivery" ? "Diagnosed and repaired as per estimate." : null,
        estimatedCompletion: mkDate(0, 17, 0),
        technicianId: tech.id,
        advisorId: advisor.id,
        priority: sc.status === "waiting_parts" ? "high" : "normal",
        status: sc.status,
        laborTotal,
        partsTotal,
        discount,
        tax,
        grandTotal: grand,
        notes: "",
      },
    });
    jcSeq++;
    await db.jobCardService.create({ data: { jobCardId: jc.id, serviceId: sv.id, name: sv.name, hours: sv.durationHours, laborPrice: sv.price, total: sv.price } });
    for (const p of partsUsed) {
      await db.jobCardPart.create({ data: { jobCardId: jc.id, partId: p.id, quantity: 1, unitPrice: p.sellingPrice, total: p.sellingPrice, status: sc.status === "completed" || sc.status === "ready_for_delivery" || sc.status === "in_progress" ? "used" : "reserved" } });
    }
    // Invoice for completed/ready/delivered
    if (sc.status === "completed" || sc.status === "ready_for_delivery") {
      const inv = await db.invoice.create({
        data: {
          tenantId: tenant.id,
          code: "INV-" + String(jcSeq).padStart(5, "0"),
          customerId: cust.id,
          vehicleId: veh.id,
          jobCardId: jc.id,
          date: mkDate(0, 12, 0),
          laborTotal,
          partsTotal,
          discount,
          tax,
          grandTotal: grand,
          paidAmount: sc.status === "completed" ? grand : 0,
          status: sc.status === "completed" ? "paid" : "unpaid",
        },
      });
      await db.invoiceItem.create({ data: { invoiceId: inv.id, type: "service", name: sv.name, quantity: 1, unitPrice: sv.price, total: sv.price } });
      for (const p of partsUsed) await db.invoiceItem.create({ data: { invoiceId: inv.id, type: "part", name: p.name, quantity: 1, unitPrice: p.sellingPrice, total: p.sellingPrice } });
      if (sc.status === "completed") {
        await db.payment.create({ data: { tenantId: tenant.id, invoiceId: inv.id, customerId: cust.id, amount: grand, method: "card", date: mkDate(0, 12, 30), reference: "TXN-" + jcSeq, note: "Full payment" } });
        cust.balance = 0;
        await db.customer.update({ where: { id: cust.id }, data: { balance: 0 } });
      } else {
        await db.customer.update({ where: { id: cust.id }, data: { balance: grand } });
      }
    }
  }

  // ─── Estimates ──────────────────────────────────────────
  const est = await db.estimate.create({
    data: {
      tenantId: tenant.id,
      code: "EST-0001",
      customerId: customers[5].id,
      vehicleId: allVehicles[6].veh.id,
      date: mkDate(0, 9, 0),
      laborTotal: serviceRecs[3].price,
      partsTotal: 0,
      discount: 0,
      tax: OMR((serviceRecs[3].price * tenant.taxPercent) / 100),
      grandTotal: OMR(serviceRecs[3].price + (serviceRecs[3].price * tenant.taxPercent) / 100),
      status: "pending",
      notes: "Awaiting customer approval for engine head gasket repair.",
    },
  });
  await db.estimateItem.create({ data: { estimateId: est.id, type: "service", name: serviceRecs[3].name, description: "Major engine repair incl. head gasket", quantity: 1, unitPrice: serviceRecs[3].price, total: serviceRecs[3].price } });

  // ─── Purchases ──────────────────────────────────────────
  const purchTotal = OMR(partRecs[0].costPrice * 20 + partRecs[1].costPrice * 30);
  const purchTax = OMR((purchTotal * tenant.taxPercent) / 100);
  const purchGrand = OMR(purchTotal + purchTax);
  const purch = await db.purchase.create({ data: { tenantId: tenant.id, code: "PO-0001", supplierId: sup1.id, warehouseId: whParts.id, date: mkDate(-3, 10, 0), status: "received", total: purchTotal, tax: purchTax, grandTotal: purchGrand, paid: purchGrand } });
  await db.purchaseItem.create({ data: { purchaseId: purch.id, partId: partRecs[0].id, quantity: 20, unitCost: partRecs[0].costPrice, total: OMR(partRecs[0].costPrice * 20) } });
  await db.purchaseItem.create({ data: { purchaseId: purch.id, partId: partRecs[1].id, quantity: 30, unitCost: partRecs[1].costPrice, total: OMR(partRecs[1].costPrice * 30) } });

  // ─── Expenses ──────────────────────────────────────────
  await db.expense.create({ data: { tenantId: tenant.id, branchId: mainBranch.id, category: "rent", amount: 800, date: mkDate(-2, 9, 0), method: "bank", description: "Monthly workshop rent" } });
  await db.expense.create({ data: { tenantId: tenant.id, branchId: mainBranch.id, category: "electricity", amount: 145.5, date: mkDate(-2, 9, 0), method: "bank", description: "Electricity bill" } });
  await db.expense.create({ data: { tenantId: tenant.id, branchId: mainBranch.id, category: "salaries", amount: 1500, date: mkDate(-1, 9, 0), method: "bank", description: "Staff salaries" } });
  await db.expense.create({ data: { tenantId: tenant.id, branchId: mainBranch.id, category: "tools", amount: 65.25, date: mkDate(-1, 11, 0), method: "cash", description: "New socket set" } });

  // ─── Warranties ─────────────────────────────────────────
  const completedJc = await db.jobCard.findFirst({ where: { status: "completed" } });
  if (completedJc) {
    await db.warranty.create({ data: { tenantId: tenant.id, type: "service", refId: completedJc.id, jobCardId: completedJc.id, periodMonths: 3, startDate: mkDate(-1, 12, 0), expiryDate: mkDate(89, 12, 0), terms: "3 months service warranty on suspension work" } });
  }

  // ─── Audit Logs ─────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: advisor.id, action: "login", module: "auth", ip: "192.168.1.10" },
      { tenantId: tenant.id, userId: tech.id, action: "job_card_status_changed", module: "job_cards", record: "JC-00001", ip: "192.168.1.11" },
      { tenantId: tenant.id, userId: accountant.id, action: "payment_received", module: "payments", record: "INV-00006", ip: "192.168.1.12" },
      { tenantId: tenant.id, userId: inv.id, action: "stock_changed", module: "inventory", record: "OIL-5W30-4L", ip: "192.168.1.13" },
    ],
  });

  console.log("Seed complete. Tenant:", tenant.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
