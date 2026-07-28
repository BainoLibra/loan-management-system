require('dotenv').config();
const { prisma, init, disconnect } = require('../db');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

async function main() {
  await init();
  console.log('Seeding massive amount of data...');

  const password = await bcrypt.hash('password123', 10);

  // 1. Create Staff Users
  console.log('Creating staff users...');
  const officerRole = ['loan_officer', 'branch_manager'];
  const staff = [];
  for (let i = 0; i < 5; i++) {
    const role = faker.helpers.arrayElement(officerRole);
    const user = await prisma.user.upsert({
      where: { email: `staff${i}@example.com` },
      update: {},
      create: {
        name: faker.person.fullName(),
        email: `staff${i}@example.com`,
        password,
        role,
      },
    });
    staff.push(user);
  }

  const cashiers = [];
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.upsert({
      where: { email: `cashier${i}@example.com` },
      update: {},
      create: {
        name: faker.person.fullName(),
        email: `cashier${i}@example.com`,
        password,
        role: 'cashier',
      },
    });
    cashiers.push(user);
  }

  // 2. Create Groups
  console.log('Creating groups...');
  const groups = [];
  for (let i = 0; i < 10; i++) {
    const groupName = faker.company.name() + ' Association';
    const group = await prisma.group.upsert({
      where: { name: groupName },
      update: {},
      create: {
        name: groupName,
        description: faker.lorem.sentence(),
      },
    });
    groups.push(group);
  }

  // 3. Create Clients
  console.log('Creating 50 clients...');
  const clients = [];
  for (let i = 0; i < 50; i++) {
    const client = await prisma.client.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        identifier: `ID-${faker.string.alphanumeric(6).toUpperCase()}`,
        groupId: faker.helpers.arrayElement([null, ...groups])?.id || null,
        guarantorName: faker.person.fullName(),
        guarantorPhone: faker.phone.number(),
        status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']),
      },
    });
    clients.push(client);
  }

  // 4. Create Loans
  console.log('Creating 100 loans...');
  const loans = [];
  const statuses = ['applied', 'approved', 'disbursed', 'closed', 'rejected'];
  
  for (let i = 0; i < 100; i++) {
    const client = faker.helpers.arrayElement(clients);
    const creator = faker.helpers.arrayElement(staff);
    const status = faker.helpers.arrayElement(statuses);
    const amount = faker.number.float({ min: 1000, max: 50000, multipleOf: 1000 });
    const termMonths = faker.helpers.arrayElement([6, 12, 24, 36]);
    const interestRate = faker.helpers.arrayElement([2, 5, 10, 15]);
    
    let approvedBy = null;
    let approvedAmount = null;
    let balance = amount;
    
    if (['approved', 'disbursed', 'closed'].includes(status)) {
      approvedBy = faker.helpers.arrayElement(staff).id;
      approvedAmount = amount;
    }
    
    if (status === 'closed') {
      balance = 0;
    }

    const loan = await prisma.loan.create({
      data: {
        clientId: client.id,
        amount,
        interestRate,
        termMonths,
        status,
        balance,
        createdBy: creator.id,
        approvedBy,
        approvedAmount,
        appliedAt: faker.date.past({ years: 1 }),
        approvedAt: ['approved', 'disbursed', 'closed'].includes(status) ? faker.date.recent({ days: 100 }) : null,
        disbursedAt: ['disbursed', 'closed'].includes(status) ? faker.date.recent({ days: 90 }) : null,
        guarantorName: faker.person.fullName(),
      },
    });
    loans.push(loan);

    // Create Schedules for disbursed or closed loans
    if (['disbursed', 'closed'].includes(status)) {
      const monthlyPayment = (amount + (amount * (interestRate / 100))) / termMonths;
      let remainingBalance = amount + (amount * (interestRate / 100));
      
      for (let m = 1; m <= termMonths; m++) {
        const principal = amount / termMonths;
        const interest = (amount * (interestRate / 100)) / termMonths;
        remainingBalance -= monthlyPayment;
        
        let scheduleStatus = 'pending';
        let paidAmount = 0;
        
        if (status === 'closed' || faker.datatype.boolean(0.7)) {
          scheduleStatus = 'paid';
          paidAmount = monthlyPayment;
          
          // Create a repayment record for paid schedules
          const cashier = faker.helpers.arrayElement(cashiers);
          await prisma.repayment.create({
            data: {
              loanId: loan.id,
              amount: monthlyPayment,
              paidBy: cashier.id,
              date: faker.date.recent({ days: 30 }),
            },
          });
        }

        await prisma.schedule.create({
          data: {
            loanId: loan.id,
            month: m,
            dueDate: new Date(new Date(loan.disbursedAt).setMonth(new Date(loan.disbursedAt).getMonth() + m)),
            payment: monthlyPayment,
            principal,
            interest,
            balance: remainingBalance > 0 ? remainingBalance : 0,
            paidAmount,
            status: scheduleStatus,
          },
        });
      }
      
      // Update actual balance based on repayments
      const totalPaid = await prisma.repayment.aggregate({
        where: { loanId: loan.id },
        _sum: { amount: true }
      });
      
      const totalDue = amount + (amount * (interestRate / 100));
      const newBalance = totalDue - (totalPaid._sum.amount || 0);
      
      await prisma.loan.update({
        where: { id: loan.id },
        data: { balance: newBalance > 0 ? newBalance : 0 }
      });
    }

    // Create Audit Logs
    await prisma.auditLog.create({
      data: {
        userId: creator.id,
        action: 'CREATE_LOAN',
        entity: 'Loan',
        entityId: loan.id,
        createdAt: loan.appliedAt,
      },
    });
    
    if (status === 'approved' || status === 'disbursed' || status === 'closed') {
      await prisma.auditLog.create({
        data: {
          userId: approvedBy,
          action: 'APPROVE_LOAN',
          entity: 'Loan',
          entityId: loan.id,
          createdAt: loan.approvedAt,
        },
      });
    }
  }

  console.log('Massive seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
