/**
 * Business Operational Needs Reference Table
 *
 * 12 franchise categories from E2_Franchise_Categories_Section5.md.
 * Each category lists 4-6 concrete operational demands a person running
 * that business actually faces day to day.
 *
 * Used by:
 *   - Step 0: Targeted follow-up questions when experience_score = WEAK
 *   - Step 3: generateFramingDecisions() AI call (operational demands input)
 *   - Step 5: Hardened generation prompt (standing backstop instruction)
 */

export interface OperationalDemand {
  /** Short label for the demand */
  label: string;
  /** Natural-language description of what this demand involves */
  description: string;
}

export interface BusinessCategoryNeeds {
  /** Platform category identifier (matches quiz_sessions.business_type values) */
  category_id: string;
  /** Human-readable category name */
  category_name: string;
  /** 4-6 concrete operational demands */
  operational_demands: OperationalDemand[];
  /** Key E-2 risk note for this category */
  e2_risk_note: string;
}

export const BUSINESS_OPERATIONAL_NEEDS: Record<string, BusinessCategoryNeeds> = {
  'home_care': {
    category_id: 'home_care',
    category_name: 'Home Care / Senior Care',
    operational_demands: [
      { label: 'Staff scheduling and dispatch', description: 'Coordinating caregiver shifts across multiple client homes, managing availability, and handling last-minute call-offs' },
      { label: 'Caregiver recruitment and retention', description: 'Hiring, training, and retaining reliable caregivers in a high-turnover industry; managing payroll and benefits' },
      { label: 'Client relationship management', description: 'Building trust with clients and their families, handling sensitive health conversations, managing expectations' },
      { label: 'Regulatory compliance', description: 'Maintaining state licensing, caregiver certifications, insurance requirements, and documentation standards' },
      { label: 'Quality control across dispersed sites', description: 'Ensuring consistent care quality when work happens in clients homes, not under direct supervision' },
      { label: 'Cash flow management', description: 'Managing recurring billing cycles, insurance claims, and payment collection from clients and families' },
    ],
    e2_risk_note: 'Investor performing care work personally rather than managing staff is the primary marginality risk.',
  },

  'child_education': {
    category_id: 'child_education',
    category_name: 'Child Education / Tutoring',
    operational_demands: [
      { label: 'Student enrollment and retention', description: 'Marketing to parents, managing trial sessions, tracking student progress, and maintaining enrollment numbers' },
      { label: 'Instructor hiring and curriculum delivery', description: 'Recruiting qualified tutors/instructors, ensuring they follow the franchise curriculum, and managing class schedules' },
      { label: 'Facility management', description: 'Maintaining a clean, safe learning environment; managing lease, utilities, and center operations' },
      { label: 'Parent communication', description: 'Regular progress reports, handling parent concerns, building community around the learning center' },
      { label: 'Scheduling and capacity optimization', description: 'Maximizing room and instructor utilization across after-school and weekend time slots' },
    ],
    e2_risk_note: 'Solo tutor without staff risks marginality challenge. Center-based model with W-2 instructors is stronger.',
  },

  'food_service': {
    category_id: 'food_service',
    category_name: 'Food Service / QSR / Fast Casual',
    operational_demands: [
      { label: 'Kitchen operations and food safety', description: 'Managing food prep, maintaining health code compliance, equipment maintenance, and inventory control' },
      { label: 'Staff scheduling and labor management', description: 'Scheduling kitchen and counter staff across peak/off-peak hours, managing labor costs against revenue' },
      { label: 'Customer service and order accuracy', description: 'Handling high-volume customer interactions, managing complaints, ensuring order accuracy and speed' },
      { label: 'Inventory and supply chain', description: 'Managing food suppliers, tracking perishable inventory, minimizing waste, negotiating vendor pricing' },
      { label: 'Local marketing and community presence', description: 'Building local awareness, managing online reviews, community partnerships, and promotional campaigns' },
      { label: 'Financial management', description: 'Daily cash reconciliation, food cost tracking, P&L management, and franchise royalty payments' },
    ],
    e2_risk_note: 'Undercapitalization and unsecured lease are primary risks. Officers understand this model well.',
  },

  'cleaning': {
    category_id: 'cleaning',
    category_name: 'Cleaning / Restoration / Property Services',
    operational_demands: [
      { label: 'Crew scheduling and dispatch', description: 'Coordinating cleaning teams across multiple job sites daily, managing routes, and handling schedule changes' },
      { label: 'Client acquisition and contract management', description: 'Building recurring commercial contracts, managing residential bookings, handling customer complaints' },
      { label: 'Quality control across unsupervised work', description: 'Ensuring consistent cleaning standards when crews work at client sites without direct oversight' },
      { label: 'Equipment and supply management', description: 'Managing cleaning equipment fleet, chemical inventory, vehicle maintenance, and supply purchasing' },
      { label: 'Workforce management', description: 'Hiring and training cleaning staff, managing high-turnover positions, ensuring background checks and reliability' },
    ],
    e2_risk_note: 'Solo operator structure without employees is the primary marginality risk.',
  },

  'fitness_wellness': {
    category_id: 'fitness_wellness',
    category_name: 'Fitness / Wellness / Yoga',
    operational_demands: [
      { label: 'Member acquisition and retention', description: 'Marketing memberships, managing trial periods, tracking member engagement, reducing churn' },
      { label: 'Staff scheduling (trainers, front desk)', description: 'Coordinating trainer schedules, front desk coverage, class instructor booking' },
      { label: 'Facility maintenance and safety', description: 'Equipment maintenance, cleanliness, safety compliance, lease management' },
      { label: 'Class programming and scheduling', description: 'Designing class schedules that maximize attendance, managing capacity limits, seasonal programming' },
      { label: 'Community building', description: 'Creating member community through events, challenges, social media engagement, and local partnerships' },
    ],
    e2_risk_note: 'Boutique concepts with no payroll risk marginality scrutiny. Full gym with equipment and staff is stronger.',
  },

  'automotive': {
    category_id: 'automotive',
    category_name: 'Automotive Services',
    operational_demands: [
      { label: 'Service bay scheduling and workflow', description: 'Managing appointment scheduling, bay utilization, technician workload, and customer wait times' },
      { label: 'Technician hiring and management', description: 'Recruiting qualified automotive technicians, managing certifications, scheduling shifts' },
      { label: 'Parts inventory and supplier relationships', description: 'Managing parts inventory, supplier accounts, ordering systems, and cost control' },
      { label: 'Customer service and trust building', description: 'Explaining repairs clearly, building long-term customer relationships, managing service expectations' },
      { label: 'Equipment and facility maintenance', description: 'Maintaining lifts, tools, diagnostic equipment; managing lease and shop facility' },
    ],
    e2_risk_note: 'Management background more important than mechanical expertise since franchise provides technical training.',
  },

  'it_services': {
    category_id: 'it_services',
    category_name: 'IT Services / Tech Repair',
    operational_demands: [
      { label: 'Client acquisition and contract sales', description: 'Building managed services contracts, selling to small businesses, managing recurring revenue' },
      { label: 'Technician staffing and scheduling', description: 'Hiring IT technicians, scheduling on-site service calls, managing remote support queue' },
      { label: 'Technical quality assurance', description: 'Ensuring service quality, managing escalation procedures, maintaining certifications' },
      { label: 'Vendor and tool management', description: 'Managing relationships with technology vendors, licensing, and tool procurement' },
      { label: 'Business development', description: 'Networking with local businesses, generating referrals, building community presence' },
    ],
    e2_risk_note: 'Low-asset, low-headcount models risk marginality. Physical premises and genuine staff hiring are critical.',
  },

  'healthcare_staffing': {
    category_id: 'healthcare_staffing',
    category_name: 'Healthcare Staffing',
    operational_demands: [
      { label: 'Recruiting and credentialing', description: 'Sourcing healthcare professionals, verifying licenses, managing compliance documentation' },
      { label: 'Client facility relationships', description: 'Building contracts with hospitals, clinics, and care facilities; managing staffing requests' },
      { label: 'Compliance and licensing', description: 'Maintaining state staffing licenses, healthcare compliance requirements, insurance standards' },
      { label: 'Internal staff management', description: 'Managing internal admin team, payroll, benefits, and operational overhead' },
      { label: 'Placement tracking and quality', description: 'Monitoring placed workers, handling performance issues, managing client satisfaction' },
    ],
    e2_risk_note: 'Placed workers are not W-2 employees. Internal headcount is what matters for non-marginality.',
  },

  'pet_services': {
    category_id: 'pet_services',
    category_name: 'Pet Services',
    operational_demands: [
      { label: 'Facility operations and safety', description: 'Maintaining safe, clean environment for animals; managing play areas, kennels, grooming stations' },
      { label: 'Staff hiring and training', description: 'Hiring pet care staff, training on animal handling, managing shift schedules' },
      { label: 'Customer relationship management', description: 'Building trust with pet owners, managing bookings, handling concerns about pet care quality' },
      { label: 'Booking and capacity management', description: 'Managing reservation systems, optimizing occupancy, handling seasonal demand fluctuations' },
      { label: 'Health and safety compliance', description: 'Maintaining vaccination records, health protocols, emergency procedures, local regulations' },
    ],
    e2_risk_note: 'Solo groomer model without employees is the primary marginality risk.',
  },

  'real_estate': {
    category_id: 'real_estate',
    category_name: 'Real Estate Services (Active)',
    operational_demands: [
      { label: 'Client acquisition and listing management', description: 'Generating leads, winning property management contracts, managing client relationships' },
      { label: 'Property operations oversight', description: 'Coordinating maintenance, tenant relations, lease management across managed properties' },
      { label: 'Staff management', description: 'Hiring property managers, maintenance staff, and admin support; managing payroll' },
      { label: 'Financial management and reporting', description: 'Managing owner distributions, rent collection, maintenance budgets, financial reporting' },
      { label: 'Regulatory compliance', description: 'Maintaining real estate licenses, fair housing compliance, insurance requirements' },
    ],
    e2_risk_note: 'Passive rental ownership does NOT qualify. Only active fee-for-service property management with staff qualifies.',
  },

  'retail': {
    category_id: 'retail',
    category_name: 'Retail (Franchise)',
    operational_demands: [
      { label: 'Inventory management', description: 'Managing stock levels, ordering, receiving, merchandising, and shrinkage control' },
      { label: 'Sales staff hiring and training', description: 'Recruiting retail staff, training on products and sales techniques, managing schedules' },
      { label: 'Customer experience', description: 'Creating in-store experience, handling customer service issues, managing reviews and reputation' },
      { label: 'Visual merchandising and store presentation', description: 'Maintaining store appearance, implementing franchise brand standards, seasonal displays' },
      { label: 'Financial operations', description: 'Managing POS systems, daily reconciliation, P&L oversight, and franchise reporting requirements' },
    ],
    e2_risk_note: 'Kiosk-only or family-only staffing risks marginality. Storefront with W-2 staff is stronger.',
  },

  'tax_preparation': {
    category_id: 'tax_preparation',
    category_name: 'Tax Preparation / Financial Services',
    operational_demands: [
      { label: 'Client acquisition and seasonal cycle', description: 'Building client base before tax season, managing seasonal workflow, retaining clients year over year' },
      { label: 'Staff hiring and licensing', description: 'Hiring preparers, managing certifications and e-file permissions, seasonal staffing' },
      { label: 'Compliance and regulatory requirements', description: 'Maintaining PTIN registrations, state licensing, IRS compliance, data security requirements' },
      { label: 'Office management', description: 'Managing physical office, client scheduling, document intake and processing workflow' },
      { label: 'Year-round service development', description: 'Expanding beyond tax prep to bookkeeping, payroll, advisory services for recurring revenue' },
    ],
    e2_risk_note: 'Solo professional practice risks marginality challenge. Staff beyond investor and physical office are critical.',
  },
};

/**
 * Look up operational needs for a business category.
 * Handles common variations in category identifiers.
 */
export function getOperationalNeeds(categoryId: string): BusinessCategoryNeeds | null {
  // Direct lookup
  if (BUSINESS_OPERATIONAL_NEEDS[categoryId]) {
    return BUSINESS_OPERATIONAL_NEEDS[categoryId];
  }

  // Normalize: lowercase, replace spaces/hyphens with underscores, strip special chars
  const normalized = categoryId
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  // Try normalized lookup
  for (const [key, value] of Object.entries(BUSINESS_OPERATIONAL_NEEDS)) {
    if (key === normalized) return value;
    if (value.category_name.toLowerCase().replace(/[\s/]+/g, '_').includes(normalized)) return value;
  }

  // Partial match — check if the normalized input is contained in any category name
  for (const value of Object.values(BUSINESS_OPERATIONAL_NEEDS)) {
    const nameNorm = value.category_name.toLowerCase().replace(/[\s/]+/g, '_');
    if (nameNorm.includes(normalized) || normalized.includes(nameNorm.split('_')[0])) {
      return value;
    }
  }

  return null;
}

/**
 * Get just the operational demand labels for a category (for prompt interpolation).
 */
export function getOperationalDemandLabels(categoryId: string): string[] {
  const needs = getOperationalNeeds(categoryId);
  if (!needs) return [];
  return needs.operational_demands.map(d => d.label);
}

/**
 * Get formatted operational demands text for prompt interpolation.
 */
export function formatOperationalDemands(categoryId: string): string {
  const needs = getOperationalNeeds(categoryId);
  if (!needs) return 'Operational demands for this business type are not yet catalogued.';
  return needs.operational_demands
    .map((d, i) => `${i + 1}. ${d.label}: ${d.description}`)
    .join('\n');
}
