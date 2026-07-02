import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function seed() {
  await db.transaction(async (tx) => {
    // ── Clear (FK-safe order) ─────────────────────────────────────────────────
    await tx.delete(schema.approvals)
    await tx.delete(schema.comments)
    await tx.delete(schema.projectMembers)
    await tx.delete(schema.milestones)
    await tx.delete(schema.projects)
    await tx.delete(schema.users)

    // ── Users ─────────────────────────────────────────────────────────────────
    const [daniel, sarah, jessica, marcus, nina, tom] = await tx
      .insert(schema.users)
      .values([
        { email: 'daniel@thescalerstudio.com', name: 'Daniel Chukwuma', role: 'admin' },
        { email: 'sarah@thescalerstudio.com',  name: 'Sarah Osei',       role: 'admin' },
        { email: 'jessica@verdantfoods.co',    name: 'Jessica Okonkwo',  role: 'client' },
        { email: 'marcus@blueprintventures.io',name: 'Marcus Hale',      role: 'client' },
        { email: 'nina@luminary.co',           name: 'Nina Chen',        role: 'client' },
        { email: 'tom.w@harborwest.com',       name: 'Tom Westbrook',    role: 'client' },
      ])
      .returning()

    // ── Projects ──────────────────────────────────────────────────────────────
    const [verdant, blueprint, luminary, harborwest] = await tx
      .insert(schema.projects)
      .values([
        {
          name:    'Verdant Foods — Brand Identity Refresh',
          slug:    'verdant-brand-identity',
          status:  'active',
          summary: 'Complete rebrand for Verdant Foods: new logo, colour system, type hierarchy, and brand guidelines ready for print and digital. Includes social media templates and a print collateral pack.',
        },
        {
          name:    'Blueprint Ventures — Website Redesign',
          slug:    'blueprint-website',
          status:  'active',
          summary: 'End-to-end redesign of blueprintventures.io — updated visual system, new homepage, and rebuilt interior pages. Handoff includes a component library and CMS-ready templates.',
        },
        {
          name:    'Luminary — Campaign Creative Suite',
          slug:    'luminary-campaign',
          status:  'active',
          summary: "Full creative suite for Luminary's spring product launch: campaign strategy, visual direction, key art, and a set of digital ad units across three formats.",
        },
        {
          name:    'Harbor West — Product Packaging System',
          slug:    'harborwest-packaging',
          status:  'completed',
          summary: "Structural and graphic packaging design for Harbor West's new premium line. Delivered print-ready files for three SKUs, including a limited-edition silver foil variant.",
        },
      ])
      .returning()

    // ── Project members ───────────────────────────────────────────────────────
    await tx.insert(schema.projectMembers).values([
      { projectId: verdant.id,    userId: jessica.id },
      { projectId: blueprint.id,  userId: marcus.id  },
      { projectId: luminary.id,   userId: nina.id    },
      { projectId: harborwest.id, userId: tom.id     },
    ])

    // ── Milestones ────────────────────────────────────────────────────────────
    const verdantMilestones = await tx
      .insert(schema.milestones)
      .values([
        {
          projectId:       verdant.id,
          title:           'Discovery & Brand Audit',
          description:     'Competitive landscape review, stakeholder interviews, and audit of existing brand assets across print and digital touchpoints.',
          status:          'approved',
          deliverableUrl:  null,
          position:        1,
        },
        {
          projectId:       verdant.id,
          title:           'Logo Concepts',
          description:     'Three distinct logo directions, each presented in primary, reversed, and monochrome variants.',
          status:          'approved',
          deliverableUrl:  'https://figma.com/file/verdant-logo-concepts',
          position:        2,
        },
        {
          projectId:       verdant.id,
          title:           'Brand Guidelines Document',
          description:     'Comprehensive brand book covering logo usage, colour system, typography, photography direction, and tone of voice.',
          status:          'in_review',
          deliverableUrl:  'https://figma.com/file/verdant-brand-guidelines',
          position:        3,
        },
        {
          projectId:       verdant.id,
          title:           'Social Media Templates',
          description:     '10 editable social templates across Instagram, LinkedIn, and Stories — built in Figma for easy client editing.',
          status:          'in_progress',
          deliverableUrl:  null,
          position:        4,
        },
        {
          projectId:       verdant.id,
          title:           'Print Collateral Pack',
          description:     'Letterhead, business cards, and envelope — print-ready files in CMYK with bleed and slug.',
          status:          'pending',
          deliverableUrl:  null,
          position:        5,
        },
      ])
      .returning()

    const blueprintMilestones = await tx
      .insert(schema.milestones)
      .values([
        {
          projectId:       blueprint.id,
          title:           'Site Architecture & Wireframes',
          description:     'Full site map and low-fidelity wireframes for all page types — desktop and mobile.',
          status:          'approved',
          deliverableUrl:  'https://figma.com/file/blueprint-wireframes',
          position:        1,
        },
        {
          projectId:       blueprint.id,
          title:           'Visual Design System',
          description:     'Component library with typography, colour tokens, button states, form elements, and card variants — documented for handoff.',
          status:          'approved',
          deliverableUrl:  'https://figma.com/file/blueprint-design-system',
          position:        2,
        },
        {
          projectId:       blueprint.id,
          title:           'Homepage Design & Build',
          description:     'Pixel-perfect homepage implementation in Next.js, responsive across all breakpoints.',
          status:          'in_review',
          deliverableUrl:  'https://blueprint-staging.vercel.app',
          position:        3,
        },
        {
          projectId:       blueprint.id,
          title:           'Interior Pages Build',
          description:     'About, Portfolio, and Contact pages built to match approved designs.',
          status:          'in_progress',
          deliverableUrl:  null,
          position:        4,
        },
        {
          projectId:       blueprint.id,
          title:           'Launch QA & Handoff',
          description:     'Cross-browser QA, performance check (Core Web Vitals), and final code handoff with deployment guide.',
          status:          'pending',
          deliverableUrl:  null,
          position:        5,
        },
      ])
      .returning()

    const luminaryMilestones = await tx
      .insert(schema.milestones)
      .values([
        {
          projectId:       luminary.id,
          title:           'Campaign Strategy Brief',
          description:     "Audience analysis, campaign narrative, key messages, and channel plan for the spring launch.",
          status:          'approved',
          deliverableUrl:  'https://docs.google.com/document/d/luminary-strategy-brief',
          position:        1,
        },
        {
          projectId:       luminary.id,
          title:           'Visual Direction Concepts',
          description:     'Two visual direction options — A (gradient energy) and B (minimal) — presented as mood boards with sample executions.',
          status:          'in_review',
          deliverableUrl:  'https://figma.com/file/luminary-visual-direction',
          position:        2,
        },
        {
          projectId:       luminary.id,
          title:           'Key Art Production',
          description:     'Hero image and two supporting assets in print and screen resolutions.',
          status:          'pending',
          deliverableUrl:  null,
          position:        3,
        },
        {
          projectId:       luminary.id,
          title:           'Digital Ad Set',
          description:     'Social and display ads in 6 formats: 1080×1080, 1080×1920, 1200×628, 300×250, 728×90, 160×600.',
          status:          'pending',
          deliverableUrl:  null,
          position:        4,
        },
      ])
      .returning()

    const harborwestMilestones = await tx
      .insert(schema.milestones)
      .values([
        {
          projectId:       harborwest.id,
          title:           'Concept Exploration',
          description:     'Three packaging directions presented as structural dielines with graphic treatments — premium, mid-range, and limited-edition options.',
          status:          'approved',
          deliverableUrl:  'https://figma.com/file/harborwest-concepts',
          position:        1,
        },
        {
          projectId:       harborwest.id,
          title:           'Design Refinement & Mockups',
          description:     'Refined direction developed across all three SKUs, with photorealistic mockups for client presentation and internal review.',
          status:          'approved',
          deliverableUrl:  'https://figma.com/file/harborwest-refinement',
          position:        2,
        },
        {
          projectId:       harborwest.id,
          title:           'Print-Ready File Delivery',
          description:     'Press-ready PDFs in CMYK with dielines, bleed, and slug for all three SKUs — including the silver foil variant spec sheet.',
          status:          'approved',
          deliverableUrl:  'https://drive.google.com/drive/folders/harborwest-final-files',
          position:        3,
        },
      ])
      .returning()

    // ── Comments ──────────────────────────────────────────────────────────────
    const [verdantAudit, verdantLogo, verdantGuidelines] = verdantMilestones
    const bpHomepage    = blueprintMilestones[2]
    const lumVisual     = luminaryMilestones[1]
    const hwFiles       = harborwestMilestones[2]

    await tx.insert(schema.comments).values([
      // Verdant — Discovery & Brand Audit
      {
        milestoneId: verdantAudit.id,
        authorId:    jessica.id,
        body:        'Really thorough work here. The gap analysis between our print and digital presence was eye-opening.',
      },
      {
        milestoneId: verdantAudit.id,
        authorId:    daniel.id,
        body:        "Thanks, Jessica. That print/digital disconnect was the main thread — the new system ties them together from the ground up.",
      },
      // Verdant — Logo Concepts
      {
        milestoneId: verdantLogo.id,
        authorId:    jessica.id,
        body:        "I'm leaning toward Direction 2 — it feels more premium without losing our roots. Could we see it on a dark background as well?",
      },
      {
        milestoneId: verdantLogo.id,
        authorId:    sarah.id,
        body:        'Adding the dark-background treatment to the next round. Will have it ready by end of week.',
      },
      {
        milestoneId: verdantLogo.id,
        authorId:    jessica.id,
        body:        'Perfect. Looking forward to it.',
      },
      // Verdant — Brand Guidelines (in_review)
      {
        milestoneId: verdantGuidelines.id,
        authorId:    jessica.id,
        body:        'This is shaping up beautifully. One question — is the heading font available for us to use in-house for things like Google Slides?',
      },
      {
        milestoneId: verdantGuidelines.id,
        authorId:    daniel.id,
        body:        "Freight Display is an Adobe Fonts library font. I've added a section in the guidelines on licensing and the closest Google Fonts alternative (Cormorant) for internal use.",
      },
      // XSS render-safety fixture: a hostile comment body that MUST render as inert text,
      // never execute. Verifies the SPECS rule "escape/sanitize comment bodies on render".
      // Kept permanently so every render of the comment list is guarded (Module 5.1 → 7).
      {
        milestoneId: verdantGuidelines.id,
        authorId:    jessica.id,
        body:        `<script>alert('xss-test-6941')</script><img src=x onerror="alert('xss-img-6941')">`,
      },
      // Blueprint — Homepage (in_review)
      {
        milestoneId: bpHomepage.id,
        authorId:    marcus.id,
        body:        'Love the direction overall — the hero section is strong. Could we nudge the primary CTA button contrast slightly? It felt a touch light on my display.',
      },
      {
        milestoneId: bpHomepage.id,
        authorId:    daniel.id,
        body:        "Bumped the CTA colour to pass WCAG AA across all our tested displays. Screenshots added to the Figma file for comparison.",
      },
      {
        milestoneId: bpHomepage.id,
        authorId:    marcus.id,
        body:        'Perfect — that is exactly it.',
      },
      // Luminary — Visual Direction (in_review)
      {
        milestoneId: lumVisual.id,
        authorId:    nina.id,
        body:        "Direction A is the one — the gradient palette is energetic and reads really well in motion. Direction B felt too quiet for a launch.",
      },
      {
        milestoneId: lumVisual.id,
        authorId:    daniel.id,
        body:        'Locking in Direction A. Key art production starts Monday.',
      },
      // Harbor West — Print-Ready Files (approved)
      {
        milestoneId: hwFiles.id,
        authorId:    tom.id,
        body:        'Files sent to the printer this morning. They confirmed everything is in order. Thank you both — really smooth process.',
      },
      {
        milestoneId: hwFiles.id,
        authorId:    sarah.id,
        body:        "Brilliant — enjoy seeing it on shelves! The silver foil variant is going to look great.",
      },
    ])

    // ── Approvals ─────────────────────────────────────────────────────────────
    await tx.insert(schema.approvals).values([
      {
        milestoneId: verdantAudit.id,
        approvedBy:  jessica.id,
        note:        null,
      },
      {
        milestoneId: verdantLogo.id,
        approvedBy:  jessica.id,
        note:        'Direction 2 is perfect — really captures where we want to take the brand.',
      },
      {
        milestoneId: blueprintMilestones[0].id,
        approvedBy:  marcus.id,
        note:        null,
      },
      {
        milestoneId: blueprintMilestones[1].id,
        approvedBy:  marcus.id,
        note:        'Clean, scalable, and well-documented. Great foundation.',
      },
      {
        milestoneId: luminaryMilestones[0].id,
        approvedBy:  nina.id,
        note:        'Nailed the brief. The audience framing is exactly right.',
      },
      {
        milestoneId: harborwestMilestones[0].id,
        approvedBy:  tom.id,
        note:        null,
      },
      {
        milestoneId: harborwestMilestones[1].id,
        approvedBy:  tom.id,
        note:        'The premium direction with silver foil — that is the one.',
      },
      {
        milestoneId: harborwestMilestones[2].id,
        approvedBy:  tom.id,
        note:        'All files confirmed with the printer. Perfect.',
      },
    ])
  })
}

seed()
  .then(() => {
    console.log('✓ Seed complete')
    console.log('  Users:          6  (2 admin, 4 client)')
    console.log('  Projects:       4  (3 active, 1 completed)')
    console.log('  Members:        4')
    console.log('  Milestones:    17  (across 4 projects)')
    console.log('  Comments:      15  (incl. 1 XSS render-safety fixture)')
    console.log('  Approvals:      8')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
