import { PrismaClient, Role, EventStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for EventFlow API...');

  // 1. Clean existing data in reverse order of foreign keys
  await prisma.idempotencyKey.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default password for test accounts
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Organizer Accounts
  const organizer1 = await prisma.user.create({
    data: {
      name: 'DevNexus Events',
      email: 'organizer1@eventflow.dev',
      passwordHash,
      role: Role.ORGANIZER,
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      name: 'Vibrant Sound Experiences',
      email: 'organizer2@eventflow.dev',
      passwordHash,
      role: Role.ORGANIZER,
    },
  });

  console.log('✅ Created 2 Organizers');

  // 4. Create Attendee Accounts
  const attendee1 = await prisma.user.create({
    data: {
      name: 'Aarav Sharma',
      email: 'aarav@eventflow.dev',
      passwordHash,
      role: Role.ATTENDEE,
    },
  });

  const attendee2 = await prisma.user.create({
    data: {
      name: 'Diya Patel',
      email: 'diya@eventflow.dev',
      passwordHash,
      role: Role.ATTENDEE,
    },
  });

  const attendee3 = await prisma.user.create({
    data: {
      name: 'Rohan Iyer',
      email: 'rohan@eventflow.dev',
      passwordHash,
      role: Role.ATTENDEE,
    },
  });

  const attendee4 = await prisma.user.create({
    data: {
      name: 'Ananya Rao',
      email: 'ananya@eventflow.dev',
      passwordHash,
      role: Role.ATTENDEE,
    },
  });

  const attendee5 = await prisma.user.create({
    data: {
      name: 'Kavya Nair',
      email: 'kavya@eventflow.dev',
      passwordHash,
      role: Role.ATTENDEE,
    },
  });

  console.log('✅ Created 5 Attendees');

  // 5. Create Events
  const now = new Date();

  // Event 1: Tech Conference with Many Available Seats (Upcoming in 30 days)
  const event1 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: 'Global AI & Cloud Summit 2026',
      description:
        'A 2-day premier technical conference covering Large Language Models, autonomous agentic systems, and high-concurrency cloud backends.',
      category: 'Technology',
      city: 'Bengaluru',
      venue: 'KTPO Trade Center, Whitefield',
      startTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000),
      capacity: 500,
      remainingCapacity: 450,
      price: 1999.0,
      status: EventStatus.UPCOMING,
    },
  });

  // Event 2: Almost Sold Out Music Concert (Upcoming in 10 days, 2 seats left!)
  const event2 = await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      title: 'Acoustic Sunset Live Tour',
      description:
        'An exclusive intimate open-air acoustic indie music concert with leading contemporary artists.',
      category: 'Music',
      city: 'Chennai',
      venue: 'Bay View Amphitheatre, ECR',
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      capacity: 100,
      remainingCapacity: 2,
      price: 1499.0,
      status: EventStatus.UPCOMING,
    },
  });

  // Event 3: Cancelled Food & Wine Expo
  const event3 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: 'Artisan Culinary Festival',
      description:
        'Gourmet food tastings, live culinary masterclasses with Michelin-starred chefs, and specialty beverage workshops.',
      category: 'Food & Dining',
      city: 'Mumbai',
      venue: 'Jio World Convention Centre, BKC',
      startTime: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      capacity: 250,
      remainingCapacity: 250,
      price: 899.0,
      status: EventStatus.CANCELLED,
    },
  });

  // Event 4: Currently Live Workshop (Started 1 hour ago, finishes in 3 hours)
  const event4 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: 'Hands-on Rust & Distributed Systems Masterclass',
      description:
        'Intensive hands-on coding lab building fault-tolerant Raft consensus clusters in Rust.',
      category: 'Education',
      city: 'Hyderabad',
      venue: 'T-Hub 2.0 Tech Arena, HITEC City',
      startTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      capacity: 50,
      remainingCapacity: 0,
      price: 2999.0,
      status: EventStatus.LIVE,
    },
  });

  // Event 5: Completed Hackathon (Ended yesterday)
  const event5 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: 'DevHack 24-Hour Hackathon 2026',
      description:
        '24-hour sprint building real-world open-source developer tooling and distributed backend solutions.',
      category: 'Technology',
      city: 'Pune',
      venue: 'Tech Park Auditorium, Hinjewadi',
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      capacity: 150,
      remainingCapacity: 0,
      price: 0.0,
      status: EventStatus.COMPLETED,
    },
  });

  // Event 6: Standup Comedy Night (Upcoming in 5 days)
  const event6 = await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      title: 'Laugh Out Loud - Standup Comedy Night',
      description:
        'An evening of non-stop laughter and relatable observational humor featuring top standup comedians.',
      category: 'Entertainment',
      city: 'Delhi',
      venue: 'Siri Fort Auditorium, August Kranti Marg',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      capacity: 300,
      remainingCapacity: 120,
      price: 799.0,
      status: EventStatus.UPCOMING,
    },
  });

  // Event 7: Electronic Dance Music Festival (Upcoming in 45 days)
  const event7 = await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      title: 'Pulse Neon Electronic Music Festival',
      description:
        'High-energy EDM festival featuring world-renowned international DJs, laser shows, and immersive soundscapes.',
      category: 'Music',
      city: 'Goa',
      venue: 'Vagator Beachfront Grounds',
      startTime: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000),
      capacity: 2000,
      remainingCapacity: 1850,
      price: 3499.0,
      status: EventStatus.UPCOMING,
    },
  });

  // Event 8: Venture Capital & Startup Pitch Night (Upcoming in 15 days)
  const event8 = await prisma.event.create({
    data: {
      organizerId: organizer1.id,
      title: 'Founders First: Seed to Series A Pitch Summit',
      description:
        'Curated pitching arena connecting top tech startup founders with tier-1 angel investors and VC partners.',
      category: 'Business',
      city: 'Bengaluru',
      venue: 'The Leela Palace Ballroom, Old Airport Road',
      startTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      capacity: 120,
      remainingCapacity: 45,
      price: 4999.0,
      status: EventStatus.UPCOMING,
    },
  });

  console.log('✅ Created 8 Realistic Events');

  // 6. Create Initial Bookings for seeded events
  await prisma.booking.create({
    data: {
      userId: attendee1.id,
      eventId: event1.id,
      quantity: 2,
      totalAmount: 3998.0,
      status: BookingStatus.CONFIRMED,
    },
  });

  await prisma.booking.create({
    data: {
      userId: attendee2.id,
      eventId: event2.id,
      quantity: 2,
      totalAmount: 2998.0,
      status: BookingStatus.CONFIRMED,
    },
  });

  await prisma.booking.create({
    data: {
      userId: attendee3.id,
      eventId: event6.id,
      quantity: 3,
      totalAmount: 2397.0,
      status: BookingStatus.CONFIRMED,
    },
  });

  console.log('✅ Created Seed Bookings');
  console.log('\n🎉 Seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Test Credentials:');
  console.log('  Organizer 1: organizer1@eventflow.dev / Password123!');
  console.log('  Organizer 2: organizer2@eventflow.dev / Password123!');
  console.log('  Attendee 1:  aarav@eventflow.dev      / Password123!');
  console.log('  Attendee 2:  diya@eventflow.dev       / Password123!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
