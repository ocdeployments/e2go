# QA audit inventory — per-page detail

> Generated 2026-09-18. Every link, button, form and input each page renders (component closure, layouts excluded — see INVENTORY.md §5). `[map]` = rendered once per data item; `[cond]` = only in some UI states.

## `/about`

- file: `src/app/about/page.tsx` · access: **public** · title: "About E2go.app" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /quiz ← "Check My Eligibility →" (page.tsx:80)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/account-recovery`

- file: `src/app/account-recovery/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser, auth.signOut
- component files: `page.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:122)
  - mailto:support@e2go.app ← "support@e2go.app" [external] (page.tsx:173)
- **buttons**
  - "Continue to dashboard" type=submit(default) onClick=`{() => router.push('/case-profile')}` (page.tsx:86)
  - "Go to dashboard" type=submit(default) onClick=`{() => router.push('/case-profile')}` (page.tsx:107)
  - "{restoring ? 'Restoring…' : 'Cancel d}" type=submit(default) onClick=`{handleRestore}` disabled=`{restoring}` (page.tsx:156)
  - "Sign out" type=submit(default) onClick=`{() => supabase.auth.signOut().then(() => router.p` (page.tsx:163)
- **API calls**
  - POST `/api/account/restore` (page.tsx:46)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:21)
  - router.push → `/case-profile` (page.tsx:87)
  - router.push → `/case-profile` (page.tsx:108)
  - router.push → `/` (page.tsx:164)

## `/admin/coming-soon-interest`

- file: `src/app/admin/coming-soon-interest/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Command Center" (page.tsx:66)

## `/admin/cost`

- file: `src/app/admin/cost/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:134)
  - /admin/users/{…} ← "{uid.slice(0, 8)} …" [map] [cond] (page.tsx:277)

## `/admin/early-access`

- file: `src/app/admin/early-access/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Command Center" (page.tsx:71)

## `/admin/franchise`

- file: `src/app/admin/franchise/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:81)

## `/admin/geography`

- file: `src/app/admin/geography/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:135)

## `/admin/intelligence`

- file: `src/app/admin/intelligence/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:172)

## `/admin`

- file: `src/app/admin/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `AdminControls.tsx`
- **links**
  - /admin/revenue ← "Revenue →" (page.tsx:194)
  - /admin/quality ← "Quality →" (page.tsx:197)
  - /admin/cost ← "Cost →" (page.tsx:200)
  - /admin/support ← "Support {openTicketsCount > 0 ? `(${openTicke}" (page.tsx:203)
  - /admin/franchise ← "Franchise →" (page.tsx:206)
  - /admin/intelligence ← "Intelligence →" (page.tsx:209)
  - /admin/geography ← "Geography →" (page.tsx:212)
  - /admin/promo-codes ← "Promo Codes →" (page.tsx:215)
  - /admin/early-access ← "Early Access →" (page.tsx:218)
  - /admin/system-status ← "System →" (page.tsx:221)
  - https://openrouter.ai/credits ← "openrouter.ai/credits" [external] [new tab] [cond] (page.tsx:242)
  - /admin/system-status ← "System Status" [cond] (page.tsx:311)
  - /admin/users/{…} ← "{emailById[p.id] \|\| '—'}" [map] (page.tsx:417)
  - /admin/system-status ← "Full System Status →" (AdminControls.tsx:45)
- **buttons**
  - "{label} : {active ? 'ON' : 'OFF'}" type=submit(default) onClick=`{onToggle}` disabled=`{disabled}` (AdminControls.tsx:65)
- **API calls**
  - POST `/api/admin/settings` (AdminControls.tsx:18)

## `/admin/promo-codes`

- file: `src/app/admin/promo-codes/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `PromoCodeForm.tsx`, `PromoCodeRowActions.tsx`
- **links**
  - /admin ← "← Command Center" (page.tsx:83)
- **buttons**
  - "{loading ? 'Creating…' : 'Create code}" type=submit onClick=`—` disabled=`{loading}` (PromoCodeForm.tsx:199)
  - "{loading ? '…' : active ? 'Deactivate}" type=submit(default) onClick=`{toggle}` disabled=`{loading}` (PromoCodeRowActions.tsx:36)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (PromoCodeForm.tsx:87)
- **inputs**
  - text name=— id=— required placeholder="E.g. WELCOME25" (PromoCodeForm.tsx:93)
  - select name=— id=— (PromoCodeForm.tsx:105)
  - select name=— id=— (PromoCodeForm.tsx:117)
  - email name=— id=— required placeholder="recipient@example.com" [cond] (PromoCodeForm.tsx:131)
  - number name=— id=— placeholder="Blank = unlimited" (PromoCodeForm.tsx:146)
  - date name=— id=— (PromoCodeForm.tsx:159)
  - text name=— id=— placeholder="E.g. Facebook group launch" (PromoCodeForm.tsx:169)
  - checkbox name=— id=— [map] (PromoCodeForm.tsx:186)
- **API calls**
  - POST `/api/admin/promo-codes` (PromoCodeForm.tsx:57)
  - PATCH `/api/admin/promo-codes/{…}` (PromoCodeRowActions.tsx:15)

## `/admin/quality`

- file: `src/app/admin/quality/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:237)

## `/admin/revenue`

- file: `src/app/admin/revenue/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:205)

## `/admin/support`

- file: `src/app/admin/support/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:90)

## `/admin/system-status`

- file: `src/app/admin/system-status/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:117)
- **buttons**
  - "(no label)" type=— onClick=`—` disabled=`{toggling}` [cond] (page.tsx:125)
  - "(no label)" type=— onClick=`—` disabled=`{toggling}` [cond] (page.tsx:132)
  - "{forcing === job.id ? 'Failing…' : 'F}" type=submit(default) onClick=`{() => forceFailJob(job.id)}` disabled=`{forcing === job.id}` [map] [cond] (page.tsx:204)
  - "{label} : {active ? 'ON' : 'OFF'}" type=submit(default) onClick=`{onToggle}` disabled=`{disabled}` (page.tsx:239)
- **API calls**
  - GET `/api/admin/health-detail` (page.tsx:66)
  - POST `/api/admin/stuck-jobs` (page.tsx:84)
  - POST `/api/admin/settings` (page.tsx:95)

## `/admin/users/[userId]`

- file: `src/app/admin/users/[userId]/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `TierOverridePanel.tsx`, `SendEmailPanel.tsx`, `FlagUserPanel.tsx`
- **links**
  - /admin ← "← Admin" (page.tsx:163)
  - /admin/users/{…}/view ← "View as User →" (page.tsx:181)
- **buttons**
  - "Override tier →" type=submit(default) onClick=`{() => setConfirming(true)}` [cond] (TierOverridePanel.tsx:85)
  - "{loading ? 'Overriding…' : 'Yes, conf}" type=submit(default) onClick=`{handleOverride}` disabled=`{loading}` [cond] (TierOverridePanel.tsx:98)
  - "Cancel" type=submit(default) onClick=`{() => setConfirming(false)}` [cond] (TierOverridePanel.tsx:105)
  - "Send Email to User" type=submit(default) onClick=`{() => setOpen(true)}` [cond] (SendEmailPanel.tsx:41)
  - "{loading ? 'Sending…' : 'Send'}" type=submit(default) onClick=`{handleSend}` disabled=`{loading \|\| !subject.trim() \|\| !message.` [cond] (SendEmailPanel.tsx:68)
  - "Cancel" type=submit(default) onClick=`{() => { setOpen(false); setResult(null); }}` [cond] (SendEmailPanel.tsx:76)
  - "Remove flag" type=submit(default) onClick=`{() => { setConfirming(true); }}` [cond] (FlagUserPanel.tsx:48)
  - "⚑ Flag for review" type=submit(default) onClick=`{() => setConfirming(true)}` [cond] (FlagUserPanel.tsx:56)
  - "{loading ? 'Saving…' : flagged ? 'Rem}" type=submit(default) onClick=`{handleToggle}` disabled=`{loading}` [cond] (FlagUserPanel.tsx:82)
  - "Cancel" type=submit(default) onClick=`{() => setConfirming(false)}` [cond] (FlagUserPanel.tsx:90)
- **inputs**
  - select name=— id=— (TierOverridePanel.tsx:62)
  - text name=— id=— placeholder="Reason for override..." (TierOverridePanel.tsx:74)
  - text name=— id=— placeholder="Subject" [cond] (SendEmailPanel.tsx:50)
  - textarea name=— id=— placeholder="Message body..." [cond] (SendEmailPanel.tsx:57)
  - text name=— id=— placeholder="Reason (e.g. suspected abuse, duplicate " [cond] (FlagUserPanel.tsx:70)
- **API calls**
  - POST `/api/admin/tier-override` (TierOverridePanel.tsx:32)
  - POST `/api/admin/send-email` (SendEmailPanel.tsx:17)
  - POST `/api/admin/flag-user` (FlagUserPanel.tsx:20)

## `/admin/users/[userId]/view`

- file: `src/app/admin/users/[userId]/view/page.tsx` · access: **admin** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /admin/users/{…} ← "← Back to User Detail" (page.tsx:110)

## `/apply/business`

- file: `src/app/apply/business/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `SimulatorNudge.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `AdvisoryBlock.tsx`, `RiskFlag.tsx`, `ClusterDivider.tsx`, `StartupCostTable.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:342)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "Dismiss coaching nudge" type=submit(default) onClick=`{handleDismiss}` (SimulatorNudge.tsx:128)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "&times;" type=submit(default) onClick=`{() => removeRow(row.id)}` [map] (StartupCostTable.tsx:123)
  - "&times;" type=submit(default) onClick=`{() => removeRow(row.id)}` [map] (StartupCostTable.tsx:184)
  - "+ Add item" type=submit(default) onClick=`{addRow}` (StartupCostTable.tsx:227)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:357)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - text name=— id=— [map] (StartupCostTable.tsx:103)
  - text name=— id=— placeholder="Category" [map] (StartupCostTable.tsx:176)
  - text name=— id=— placeholder="Description" [map] (StartupCostTable.tsx:192)
  - text name=— id=— placeholder="0" [map] (StartupCostTable.tsx:207)
- **API calls**
  - POST `/api/answers` (page.tsx:280)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - GET `/api/simulator/section-nudge?section={…}` (SimulatorNudge.tsx:25)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:383)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)
- **browser storage keys**: `{dismissKey}`

## `/apply/calendar`

- file: `src/app/apply/calendar/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /dashboard ← "← Back to Dashboard" (page.tsx:262)
  - /quiz ← "Start eligibility quiz →" (page.tsx:272)
  - /dashboard ← "← Back to Dashboard" (page.tsx:291)
  - /documents ← "Next: Documents →" (page.tsx:298)
- **buttons**
  - "{updating ? "Saving..." : "Lock In De}" type=submit(default) onClick=`{handleConfirmDate}` disabled=`{!inputDate \|\| updating}` [cond] (page.tsx:359)
  - "Update date" type=submit(default) onClick=`{() => { setInputDate(timeline.confirmedInterviewD` [cond] (page.tsx:385)
  - "{item.status === "completed" && ( <sv}" type=submit(default) onClick=`{() => handleMarkComplete(item.itemType)}` disabled=`{item.status === "completed" \|\| !timelin` [map] (page.tsx:420)
- **inputs**
  - date name=— id=— [cond] (page.tsx:352)

## `/apply/checklist`

- file: `src/app/apply/checklist/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `PreAppChecklist.tsx`
- **links**
  - /quiz ← "Take Eligibility Quiz" (PreAppChecklist.tsx:37)
- **buttons**
  - "{checkedItems.has(item.id) && ( <Chec}" type=submit(default) onClick=`{() => handleToggle(item.id)}` [map] (PreAppChecklist.tsx:108)
  - "Remove" type=submit(default) onClick=`{() => handleRemove(item.id)}` [map] [cond] (PreAppChecklist.tsx:159)
  - "{showHidden ? <ChevronDown className=} Hidden items ( {removedItems.length} )" type=submit(default) onClick=`{() => setShowHidden(!showHidden)}` [cond] (PreAppChecklist.tsx:176)
  - "Restore" type=submit(default) onClick=`{() => handleRestore(item.id)}` [map] [cond] (PreAppChecklist.tsx:194)
- **browser storage keys**: `e2go_quiz_result`

## `/apply/dependent/[familyMemberId]`

- file: `src/app/apply/dependent/[familyMemberId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `ApplicationNotReadyScreen.tsx`, `QuestionSetRunner.tsx`, `ClusterDivider.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `PhoneInput.tsx`, `DateInput.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`
- **links**
  - /case-profile ← "← Back to Case Profile" (page.tsx:66)
  - /apply/security/{…} ← "Security &amp; Background → Required sworn statement — health, criminal history, and immig" (page.tsx:98)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (QuestionSetRunner.tsx:104)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (QuestionSetRunner.tsx:117)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
- **inputs**
  - TextArea name=— id=— [map] [cond] (QuestionSetRunner.tsx:137)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - tel name=— id=— placeholder="{placeholder ?? '+1 415 555 0100'}" (PhoneInput.tsx:34)
  - date name=— id=— (DateInput.tsx:27)
- **API calls**
  - POST `/api/answers` (QuestionSetRunner.tsx:64)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:49)

## `/apply/family`

- file: `src/app/apply/family/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `AdvisoryBlock.tsx`, `ClusterDivider.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:241)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (page.tsx:254)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:274)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
- **API calls**
  - POST `/api/answers` (page.tsx:162)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:286)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)

## `/apply/investment`

- file: `src/app/apply/investment/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `SimulatorNudge.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `CurrencyInput.tsx`, `AdvisoryBlock.tsx`, `RiskFlag.tsx`, `ClusterDivider.tsx`, `ProjectionTable.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:336)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (page.tsx:349)
  - "(no label)" type=— onClick=`{() => handleAnswerChange('M3-H-SELLER', 'yes')}` [cond] (page.tsx:605)
  - "(no label)" type=— onClick=`{() => handleAnswerChange('M3-H-SELLER', 'no')}` [cond] (page.tsx:606)
  - "(no label)" type=— onClick=`{() => handleAnswerChange('M3-I-BREAKEVEN', opt.va` [map] [cond] (page.tsx:656)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "Dismiss coaching nudge" type=submit(default) onClick=`{handleDismiss}` (SimulatorNudge.tsx:128)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:375)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - text name=— id=— placeholder="{placeholder \|\| '0'}" (CurrencyInput.tsx:49)
  - text name=— id=— placeholder="{field === 'employees' ? '0' : '0'}" [map] (ProjectionTable.tsx:89)
  - text name=— id=— placeholder="{field === 'employees' ? '0' : '0'}" [map] (ProjectionTable.tsx:138)
- **API calls**
  - POST `/api/answers` (page.tsx:295)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - GET `/api/simulator/section-nudge?section={…}` (SimulatorNudge.tsx:25)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:395)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)
- **browser storage keys**: `{dismissKey}`

## `/apply/module1`

- file: `src/app/apply/module1/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ComingSoonNotifyButton.tsx`
- **links**
  - /terms ← "Terms of Service" [new tab] [cond] (page.tsx:396)
  - /privacy ← "Privacy Policy" [new tab] [cond] (page.tsx:397)
  - /terms ← "Terms of Service" [new tab] [cond] (page.tsx:423)
  - /privacy ← "Privacy Policy" [new tab] [cond] (page.tsx:443)
- **buttons**
  - "Solo One investor applying alone" type=submit(default) onClick=`{() => setApplicationType("solo")}` [cond] (page.tsx:309)
  - "Partnership Coming Soon Two or more investors applying together — not yet available. Let u" type=— onClick=`—` [cond] (page.tsx:334)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:369)
  - "Begin my application →" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep1Valid}` [cond] (page.tsx:372)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:449)
  - "Continue →" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep2Valid}` [cond] (page.tsx:452)
  - "Yes, keep me informed Receive helpful updates and preparation tips." type=submit(default) onClick=`{() => setCaslConsent(true)}` [cond] (page.tsx:479)
  - "No thanks Just the essential application updates." type=submit(default) onClick=`{() => setCaslConsent(false)}` [cond] (page.tsx:491)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:505)
  - "Continue →" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep3Valid}` [cond] (page.tsx:508)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:561)
  - "Continue →" type=submit(default) onClick=`{handleNext}` [cond] (page.tsx:564)
  - "{state === 'loading' ? 'Sending…' : s}" type=button onClick=`{handleClick}` disabled=`{state === 'loading'}` (ComingSoonNotifyButton.tsx:52)
- **inputs**
  - text name=— id=— placeholder="Enter partner's legal name" [cond] (page.tsx:345)
  - email name=— id=— placeholder="partner@example.com" [cond] (page.tsx:357)
  - checkbox name=— id=— [cond] (page.tsx:409)
  - checkbox name=— id=— [cond] (page.tsx:429)
  - checkbox name=— id=— [map] [cond] (page.tsx:538)
- **API calls**
  - POST `/api/consent/log` (page.tsx:144)
  - POST `/api/coming-soon-interest` (ComingSoonNotifyButton.tsx:22)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module1` (page.tsx:86)
  - router.push → `/quiz` (page.tsx:99)
  - router.push → `/dashboard` (page.tsx:130)
  - router.push → `/apply/module2` (page.tsx:250)

## `/apply/module2`

- file: `src/app/apply/module2/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "{opt.label}" type=submit(default) onClick=`{() => setBackground(opt.id)}` [map] [cond] (page.tsx:314)
  - "{opt.label}" type=submit(default) onClick=`{() => setBudget(opt.id)}` [map] [cond] (page.tsx:327)
  - "{opt.label}" type=submit(default) onClick=`{() => setStatePref(opt.id)}` [map] [cond] (page.tsx:340)
  - "{opt.label}" type=submit(default) onClick=`{() => setBusinessInMind(opt.id)}` [map] [cond] (page.tsx:353)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:377)
  - "{saving ? "Saving..." : "Continue →"}" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep1Valid \|\| saving}` [cond] (page.tsx:378)
  - "{cat.name} E-2 {cat.complexity === "green" ? "Straig} {cat.description} Min: {cat.minInves" type=submit(default) onClick=`{() => { if (isSelected) setSelectedCategories(sel` disabled=`{!canSelect}` [map] [cond] (page.tsx:399)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:443)
  - "{saving ? "Saving..." : "Continue →"}" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep2Valid \|\| saving}` [cond] (page.tsx:444)
  - "{isSaved ? "Saved" : "Save"}" type=submit(default) onClick=`{() => { if (isSaved) setShortlist(shortlist.filte` disabled=`{!isSaved && shortlist.length >= 3}` [map] [cond] (page.tsx:484)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:513)
  - "{saving ? "Saving..." : "Continue →"}" type=submit(default) onClick=`{handleNext}` disabled=`{saving}` [cond] (page.tsx:514)
  - "Yes, connect me We will introduce you to a vetted specialist." type=submit(default) onClick=`{() => setFranchiseReferral(true)}` [cond] (page.tsx:532)
  - "No thanks, I&apos;ll find my own I prefer to research franchises independently." type=submit(default) onClick=`{() => setFranchiseReferral(false)}` [cond] (page.tsx:539)
  - "No thanks, I&apos;ll find my own" type=submit(default) onClick=`{() => setFranchiseReferral(false)}` [cond] (page.tsx:562)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:572)
  - "{saving ? "Saving..." : "Continue →"}" type=submit(default) onClick=`{handleNext}` disabled=`{!isStep4Valid \|\| saving}` [cond] (page.tsx:573)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:603)
  - "{saving ? "Saving..." : "Continue →"}" type=submit(default) onClick=`{handleNext}` disabled=`{saving}` [cond] (page.tsx:604)
  - "Start your application profile →" type=submit(default) onClick=`{handleNext}` [cond] (page.tsx:642)
- **inputs**
  - text name=— id=— placeholder="e.g., A specialty coffee shop in Austin," [cond] (page.tsx:365)
  - checkbox name=— id=— [cond] (page.tsx:552)
- **API calls**
  - POST `/api/answers` (page.tsx:194)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module2` (page.tsx:113)
  - router.push → `/apply/module1` (page.tsx:124)
  - router.push → `/apply/module1` (page.tsx:243)
  - router.push → `/apply` (page.tsx:269)

## `/apply/module3/a`

- file: `src/app/apply/module3/a/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ApplicationContext.tsx`, `TabPage.tsx`, `TabSidebar.tsx`, `SectionForm.tsx`, `animated-gradient-border.tsx`, `FormField.tsx`, `PreFilledField.tsx`
- **buttons**
  - "Try Again" type=submit(default) onClick=`{handleRetry}` (page.tsx:192)
  - "{index + 1} {section.title}" type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabPage.tsx:26)
  - "{section.title} {section.answeredCount} of {section.questionCount} questions {isActive && " type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabSidebar.tsx:122)
  - "{saveStatus === 'saving' && ( <> <spa} {saveStatus === 'saved' && ( <> <svg } {saveStatus " type=button onClick=`{handleManualSave}` disabled=`{saveStatus === 'saving' \|\| isSaveDisabl` (SectionForm.tsx:159)
  - "Skip" type=button onClick=`{onSkip}` [cond] (FormField.tsx:362)
  - "Revert" type=button onClick=`{handleRevert}` [cond] (PreFilledField.tsx:145)
  - "Edit" type=button onClick=`{handleEdit}` [cond] (PreFilledField.tsx:154)
- **inputs**
  - text name=— id=— placeholder="{field.placeholder}" (FormField.tsx:54)
  - textarea name=— id=— placeholder="{field.placeholder}" (FormField.tsx:81)
  - select name=— id=— (FormField.tsx:108)
  - date name=— id=— (FormField.tsx:178)
  - date name=— id=— (FormField.tsx:205)
  - date name=— id=— (FormField.tsx:230)
  - number name=— id=— placeholder="0.00" (FormField.tsx:262)
  - number name=— id=— placeholder="0" (FormField.tsx:291)
  - text name=— id=— (FormField.tsx:320)
  - checkbox name=— id=— [cond] (PreFilledField.tsx:170)
- **API calls**
  - POST `/api/answers` (ApplicationContext.tsx:96)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module3/a` (page.tsx:117)

## `/apply/module3/b`

- file: `src/app/apply/module3/b/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:566)
  - "View My Checklist →" type=submit(default) onClick=`{() => setScreenState('question')}` (page.tsx:595)
  - "Back" type=submit(default) onClick=`{() => router.push('/apply/module3/a')}` (page.tsx:603)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:626)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:684)
  - "Continue to Tab C →" type=submit(default) onClick=`{() => setScreenState('completion')}` (page.tsx:744)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:768)
  - "Continue to Tab C →" type=submit(default) onClick=`{() => router.push('/apply/module3/c')}` (page.tsx:805)
  - "{item.checked && ( <svg className="w-} {item.name} Tab {item.binderTab} {item.obtainLocati" type=button onClick=`{() => onCheck(item.id, !item.checked)}` (page.tsx:904)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module3/b` (page.tsx:491)
  - router.push → `/` (page.tsx:566)
  - router.push → `/apply/module3/a` (page.tsx:604)
  - router.push → `/` (page.tsx:626)
  - router.push → `/` (page.tsx:684)
  - router.push → `/` (page.tsx:768)
  - router.push → `/apply/module3/c` (page.tsx:806)

## `/apply/module3/c`

- file: `src/app/apply/module3/c/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:141)
  - "Generate My Letter →" type=submit(default) onClick=`{() => setScreenState('question')}` (page.tsx:171)
  - "Back" type=submit(default) onClick=`{() => router.push('/apply/module3/b')}` (page.tsx:179)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:212)
  - "Yes, this is correct" type=submit(default) onClick=`{() => handleConfirm(true)}` (page.tsx:295)
  - "Something looks wrong — I need to make a change" type=submit(default) onClick=`{() => handleConfirm(false)}` (page.tsx:302)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:326)
  - "Continue to Tab D →" type=submit(default) onClick=`{() => router.push('/apply/module3/d')}` (page.tsx:351)
  - "E2go.app" type=button onClick=`{() => router.push('/')}` (page.tsx:374)
  - "Continue to Tab D →" type=submit(default) onClick=`{() => router.push('/apply/module3/d')}` (page.tsx:399)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module3/c` (page.tsx:36)
  - router.push → `/` (page.tsx:141)
  - router.push → `/apply/module3/b` (page.tsx:180)
  - router.push → `/` (page.tsx:212)
  - router.push → `/` (page.tsx:326)
  - router.push → `/apply/module3/d` (page.tsx:352)
  - router.push → `/` (page.tsx:374)
  - router.push → `/apply/module3/d` (page.tsx:400)

## `/apply/module3/d`

- file: `src/app/apply/module3/d/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "Begin Cover Letter Questions →" type=submit(default) onClick=`{handleIntroStart}` (page.tsx:460)
  - "Back" type=submit(default) onClick=`{() => router.push('/apply/module3/c')}` (page.tsx:469)
  - "This looks correct — confirm →" type=submit(default) onClick=`{handleConfirmLetter}` [cond] (page.tsx:545)
  - "I need to make a change" type=submit(default) onClick=`{handleEditRequest}` [cond] (page.tsx:553)
  - "Continue to Ownership Structure →" type=submit(default) onClick=`{handleCompletionNext}` (page.tsx:630)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:768)
  - "{saveStatus === 'saving' ? 'Saving...}" type=submit(default) onClick=`{handleContinue}` disabled=`{saveStatus === 'saving'}` [cond] (page.tsx:775)
- **inputs**
  - checkbox name=— id=— [cond] (page.tsx:736)
  - textarea name=— id=— placeholder="{currentQuestion.hasNAOption && !hasComp" [cond] (page.tsx:749)
- **API calls**
  - POST `/api/ai` (page.tsx:349)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module3/d` (page.tsx:127)
  - router.push → `/apply/module3/e` (page.tsx:318)
  - router.push → `/apply/module3/c` (page.tsx:470)

## `/apply/module3/e`

- file: `src/app/apply/module3/e/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ApplicationContext.tsx`, `TabPage.tsx`, `ContradictionFlag.tsx`, `TabSidebar.tsx`, `SectionForm.tsx`, `animated-gradient-border.tsx`, `FormField.tsx`, `PreFilledField.tsx`
- **buttons**
  - "{index + 1} {section.title}" type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabPage.tsx:26)
  - "Use &quot; {fieldAValue} &quot; ( {fieldALabel} )" type=submit(default) onClick=`{() => { setResolved(true); onUseA(); }}` (ContradictionFlag.tsx:55)
  - "Use &quot; {fieldBValue} &quot; ( {fieldBLabel} )" type=submit(default) onClick=`{() => { setResolved(true); onUseB(); }}` (ContradictionFlag.tsx:69)
  - "{section.title} {section.answeredCount} of {section.questionCount} questions {isActive && " type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabSidebar.tsx:122)
  - "{saveStatus === 'saving' && ( <> <spa} {saveStatus === 'saved' && ( <> <svg } {saveStatus " type=button onClick=`{handleManualSave}` disabled=`{saveStatus === 'saving' \|\| isSaveDisabl` (SectionForm.tsx:159)
  - "Skip" type=button onClick=`{onSkip}` [cond] (FormField.tsx:362)
  - "Revert" type=button onClick=`{handleRevert}` [cond] (PreFilledField.tsx:145)
  - "Edit" type=button onClick=`{handleEdit}` [cond] (PreFilledField.tsx:154)
- **inputs**
  - text name=— id=— placeholder="{field.placeholder}" (FormField.tsx:54)
  - textarea name=— id=— placeholder="{field.placeholder}" (FormField.tsx:81)
  - select name=— id=— (FormField.tsx:108)
  - date name=— id=— (FormField.tsx:178)
  - date name=— id=— (FormField.tsx:205)
  - date name=— id=— (FormField.tsx:230)
  - number name=— id=— placeholder="0.00" (FormField.tsx:262)
  - number name=— id=— placeholder="0" (FormField.tsx:291)
  - text name=— id=— (FormField.tsx:320)
  - checkbox name=— id=— [cond] (PreFilledField.tsx:170)
- **API calls**
  - POST `/api/answers` (ApplicationContext.tsx:96)

## `/apply/module3/f`

- file: `src/app/apply/module3/f/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ApplicationContext.tsx`, `TabPage.tsx`, `TabSidebar.tsx`, `SectionForm.tsx`, `animated-gradient-border.tsx`, `FormField.tsx`, `PreFilledField.tsx`
- **buttons**
  - "{index + 1} {section.title}" type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabPage.tsx:26)
  - "{section.title} {section.answeredCount} of {section.questionCount} questions {isActive && " type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabSidebar.tsx:122)
  - "{saveStatus === 'saving' && ( <> <spa} {saveStatus === 'saved' && ( <> <svg } {saveStatus " type=button onClick=`{handleManualSave}` disabled=`{saveStatus === 'saving' \|\| isSaveDisabl` (SectionForm.tsx:159)
  - "Skip" type=button onClick=`{onSkip}` [cond] (FormField.tsx:362)
  - "Revert" type=button onClick=`{handleRevert}` [cond] (PreFilledField.tsx:145)
  - "Edit" type=button onClick=`{handleEdit}` [cond] (PreFilledField.tsx:154)
- **inputs**
  - text name=— id=— placeholder="{field.placeholder}" (FormField.tsx:54)
  - textarea name=— id=— placeholder="{field.placeholder}" (FormField.tsx:81)
  - select name=— id=— (FormField.tsx:108)
  - date name=— id=— (FormField.tsx:178)
  - date name=— id=— (FormField.tsx:205)
  - date name=— id=— (FormField.tsx:230)
  - number name=— id=— placeholder="0.00" (FormField.tsx:262)
  - number name=— id=— placeholder="0" (FormField.tsx:291)
  - text name=— id=— (FormField.tsx:320)
  - checkbox name=— id=— [cond] (PreFilledField.tsx:170)
- **API calls**
  - POST `/api/answers` (ApplicationContext.tsx:96)

## `/apply/module3/g`

- file: `src/app/apply/module3/g/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - router.replace → `/apply/business` (page.tsx:9)

## `/apply/module3/h`

- file: `src/app/apply/module3/h/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - router.replace → `/apply/investment` (page.tsx:9)

## `/apply/module3/i`

- file: `src/app/apply/module3/i/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ApplicationContext.tsx`, `TabPage.tsx`, `TabSidebar.tsx`, `SectionForm.tsx`, `animated-gradient-border.tsx`, `FormField.tsx`, `PreFilledField.tsx`
- **buttons**
  - "{index + 1} {section.title}" type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabPage.tsx:26)
  - "{section.title} {section.answeredCount} of {section.questionCount} questions {isActive && " type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabSidebar.tsx:122)
  - "{saveStatus === 'saving' && ( <> <spa} {saveStatus === 'saved' && ( <> <svg } {saveStatus " type=button onClick=`{handleManualSave}` disabled=`{saveStatus === 'saving' \|\| isSaveDisabl` (SectionForm.tsx:159)
  - "Skip" type=button onClick=`{onSkip}` [cond] (FormField.tsx:362)
  - "Revert" type=button onClick=`{handleRevert}` [cond] (PreFilledField.tsx:145)
  - "Edit" type=button onClick=`{handleEdit}` [cond] (PreFilledField.tsx:154)
- **inputs**
  - text name=— id=— placeholder="{field.placeholder}" (FormField.tsx:54)
  - textarea name=— id=— placeholder="{field.placeholder}" (FormField.tsx:81)
  - select name=— id=— (FormField.tsx:108)
  - date name=— id=— (FormField.tsx:178)
  - date name=— id=— (FormField.tsx:205)
  - date name=— id=— (FormField.tsx:230)
  - number name=— id=— placeholder="0.00" (FormField.tsx:262)
  - number name=— id=— placeholder="0" (FormField.tsx:291)
  - text name=— id=— (FormField.tsx:320)
  - checkbox name=— id=— [cond] (PreFilledField.tsx:170)
- **API calls**
  - POST `/api/answers` (ApplicationContext.tsx:96)

## `/apply/module3/j`

- file: `src/app/apply/module3/j/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "{(answers as Record<string, string>)[} {opt.label}" type=submit(default) onClick=`{() => handleAnswerChange(currentQuestion.key, opt` [map] (page.tsx:347)
  - "This looks correct →" type=submit(default) onClick=`{handleConfirmOrgChart}` (page.tsx:474)
  - "Edit my answers" type=submit(default) onClick=`{handleEditAnswers}` (page.tsx:481)
  - "Begin Qualifications →" type=submit(default) onClick=`{handleIntroStart}` (page.tsx:537)
  - "Back" type=submit(default) onClick=`{() => router.push('/apply/module3/i')}` (page.tsx:545)
  - "Continue to Business Plan →" type=submit(default) onClick=`{handleCompletionNext}` (page.tsx:642)
  - "Back" type=submit(default) onClick=`{handleBack}` [cond] (page.tsx:725)
  - "{saveStatus === 'saving' ? 'Saving...}" type=submit(default) onClick=`{handleContinue}` disabled=`{saveStatus === 'saving'}` [cond] (page.tsx:732)
- **inputs**
  - textarea name=— id=— placeholder="{currentQuestion.type === 'education' ? " (page.tsx:323)
  - checkbox name=— id=— [cond] (page.tsx:373)
  - textarea name=— id=— placeholder="Type your answer here..." (page.tsx:383)
- **programmatic navigation**
  - router.push → `/login?next=/apply/module3/j` (page.tsx:134)
  - router.push → `/apply/module3/k` (page.tsx:285)
  - router.push → `/apply/module3/i` (page.tsx:546)

## `/apply/module3/k`

- file: `src/app/apply/module3/k/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `ApplicationContext.tsx`, `TabPage.tsx`, `TabSidebar.tsx`, `SectionForm.tsx`, `animated-gradient-border.tsx`, `FormField.tsx`, `PreFilledField.tsx`
- **buttons**
  - "{index + 1} {section.title}" type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabPage.tsx:26)
  - "{section.title} {section.answeredCount} of {section.questionCount} questions {isActive && " type=submit(default) onClick=`{() => onSectionClick(section.id)}` [map] (TabSidebar.tsx:122)
  - "{saveStatus === 'saving' && ( <> <spa} {saveStatus === 'saved' && ( <> <svg } {saveStatus " type=button onClick=`{handleManualSave}` disabled=`{saveStatus === 'saving' \|\| isSaveDisabl` (SectionForm.tsx:159)
  - "Skip" type=button onClick=`{onSkip}` [cond] (FormField.tsx:362)
  - "Revert" type=button onClick=`{handleRevert}` [cond] (PreFilledField.tsx:145)
  - "Edit" type=button onClick=`{handleEdit}` [cond] (PreFilledField.tsx:154)
- **inputs**
  - text name=— id=— placeholder="{field.placeholder}" (FormField.tsx:54)
  - textarea name=— id=— placeholder="{field.placeholder}" (FormField.tsx:81)
  - select name=— id=— (FormField.tsx:108)
  - date name=— id=— (FormField.tsx:178)
  - date name=— id=— (FormField.tsx:205)
  - date name=— id=— (FormField.tsx:230)
  - number name=— id=— placeholder="0.00" (FormField.tsx:262)
  - number name=— id=— placeholder="0" (FormField.tsx:291)
  - text name=— id=— (FormField.tsx:320)
  - checkbox name=— id=— [cond] (PreFilledField.tsx:170)
- **API calls**
  - POST `/api/answers` (ApplicationContext.tsx:96)

## `/apply/module3/l`

- file: `src/app/apply/module3/l/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - router.replace → `/apply/family` (page.tsx:9)

## `/apply/module3`

- file: `src/app/apply/module3/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "{tab.complete ? "✓" : tab.letter} {tab.title}" type=submit(default) onClick=`{() => router.push(`/apply/module3/${tab.letter.to` [map] (page.tsx:145)
  - "Generate My Package →" type=submit(default) onClick=`{handleGeneratePackage}` disabled=`{!applicationId}` [cond] (page.tsx:197)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **programmatic navigation**
  - router.push → `/generate/{…}` (page.tsx:89)
  - router.push → `/login` (page.tsx:95)
  - router.push → `/apply/module3/{…}` (page.tsx:148)

## `/apply/module4`

- file: `src/app/apply/module4/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "Let&apos;s Begin →" type=submit(default) onClick=`{() => setScreen(2)}` (page.tsx:258)
  - "Write in My Own Words →" type=submit(default) onClick=`{handleRegenerateSample}` disabled=`{isSavingVoice}` [cond] (page.tsx:334)
  - "{isSavingVoice ? 'Analyzing your writ}" type=submit(default) onClick=`{handleSaveVoiceSample}` disabled=`{wordCount < 30 \|\| isSavingVoice}` [cond] (page.tsx:343)
  - "Try Again →" type=submit(default) onClick=`{() => { setQuestionsError(false); handleGenerateQ` (page.tsx:373)
  - "Skip this question" type=submit(default) onClick=`{handleSkipQuestion}` (page.tsx:449)
  - "{isSavingAnswer ? 'Saving...' : curre}" type=submit(default) onClick=`{handleNextQuestion}` disabled=`{isSavingAnswer \|\| !(answers[currentQues` (page.tsx:457)
  - "Generate My Documents →" type=submit(default) onClick=`{() => applicationId && router.push(`/generate/${a` (page.tsx:525)
  - "Review My Application First" type=submit(default) onClick=`{() => router.push('/apply')}` (page.tsx:533)
- **inputs**
  - textarea name=— id=— placeholder="I chose this business because..." (page.tsx:288)
  - textarea name=— id=— placeholder="Your answer..." (page.tsx:429)
- **API calls**
  - POST `/api/followup/save-voice-sample` (page.tsx:81)
  - POST `/api/followup/generate-questions` (page.tsx:125)
  - POST `/api/followup/save-response` (page.tsx:150)
  - POST `/api/followup/completion-summary` (page.tsx:203)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:51)
  - router.push → `/generate/{…}` (page.tsx:526)
  - router.push → `/apply` (page.tsx:534)

## `/apply/overview`

- file: `src/app/apply/overview/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - router.replace → `/apply{…}` (page.tsx:12)

## `/apply`

- file: `src/app/apply/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - redirect → `/case-profile` (page.tsx:8)

## `/apply/partner2`

- file: `src/app/apply/partner2/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /case-profile ← "Back to case" (page.tsx:224)
  - /case-profile ← "Return to case" (page.tsx:264)
  - /case-profile ← "My case" (page.tsx:279)
  - / ← "E2go.app" (page.tsx:285)
- **buttons**
  - "{isComplete ? 'Save & return to case'}" type=submit(default) onClick=`{() => { if (isComplete) router.push('/case-profil` disabled=`{!isComplete}` (page.tsx:230)
- **inputs**
  - textarea name=— id=— placeholder="{q.placeholder}" [map] [cond] (page.tsx:174)
  - text name=— id=— placeholder="{q.placeholder}" [map] [cond] (page.tsx:195)
- **API calls**
  - GET `/api/partner2/intake?applicationId={…}` (page.tsx:96)
  - PATCH `/api/partner2/intake` (page.tsx:114)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:97)
  - router.push → `/pricing` (page.tsx:98)
  - router.push → `/case-profile` (page.tsx:245)

## `/apply/qualifications`

- file: `src/app/apply/qualifications/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `SimulatorNudge.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `AdvisoryBlock.tsx`, `RiskFlag.tsx`, `ClusterDivider.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:306)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (page.tsx:319)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "Dismiss coaching nudge" type=submit(default) onClick=`{handleDismiss}` (SimulatorNudge.tsx:128)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:345)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
- **API calls**
  - POST `/api/answers` (page.tsx:250)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - GET `/api/simulator/section-nudge?section={…}` (SimulatorNudge.tsx:25)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:365)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)
- **browser storage keys**: `{dismissKey}`

## `/apply/security/[personId]`

- file: `src/app/apply/security/[personId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `ApplicationNotReadyScreen.tsx`, `QuestionSetRunner.tsx`, `AdvisoryBlock.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `PhoneInput.tsx`, `DateInput.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`
- **links**
  - {backHref} ← "← Back" (page.tsx:76)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "{area.label}" type=submit(default) onClick=`{() => setActiveAreaKey(area.key)}` [map] (page.tsx:93)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (QuestionSetRunner.tsx:104)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (QuestionSetRunner.tsx:117)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
- **inputs**
  - TextArea name=— id=— [map] [cond] (QuestionSetRunner.tsx:137)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - tel name=— id=— placeholder="{placeholder ?? '+1 415 555 0100'}" (PhoneInput.tsx:34)
  - date name=— id=— (DateInput.tsx:27)
- **API calls**
  - POST `/api/answers` (QuestionSetRunner.tsx:64)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:53)

## `/apply/story`

- file: `src/app/apply/story/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `SimulatorNudge.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `PhoneInput.tsx`, `DateInput.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `AdvisoryBlock.tsx`, `ClusterDivider.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "▶ What makes a strong answer?" type=submit(default) onClick=`{() => toggleGuidance(q.key)}` [map] [cond] (page.tsx:358)
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, 'na')}` [map] [cond] (page.tsx:391)
  - "▶ What makes a strong answer?" type=submit(default) onClick=`{() => toggleGuidance(q.key)}` [map] [cond] (page.tsx:413)
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:452)
  - "(no label)" type=— onClick=`{() => {}}` [cond] (page.tsx:485)
  - "(no label)" type=— onClick=`{() => handleAnswerChange('M3-A-08', '')}` [cond] (page.tsx:490)
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:515)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "Dismiss coaching nudge" type=submit(default) onClick=`{handleDismiss}` (SimulatorNudge.tsx:128)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:344)
  - TextArea name=— id=— [map] [cond] (page.tsx:405)
  - TextArea name=— id=— [map] [cond] (page.tsx:524)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - tel name=— id=— placeholder="{placeholder ?? '+1 415 555 0100'}" (PhoneInput.tsx:34)
  - date name=— id=— (DateInput.tsx:27)
- **API calls**
  - POST `/api/answers` (page.tsx:233)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - GET `/api/simulator/section-nudge?section={…}` (SimulatorNudge.tsx:25)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:293)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)
- **browser storage keys**: `{dismissKey}`

## `/apply/ties`

- file: `src/app/apply/ties/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate
- component files: `page.tsx`, `CaseFileShell.tsx`, `SimulatorNudge.tsx`, `QuestionLabel.tsx`, `HelperText.tsx`, `TextInput.tsx`, `TextArea.tsx`, `OptionButton.tsx`, `PreFillBadge.tsx`, `AdvisoryBlock.tsx`, `CurrencyInput.tsx`, `RiskFlag.tsx`, `ClusterDivider.tsx`, `ApplicationNotReadyScreen.tsx`
- **links**
  - {tab.href} ← "{status === 'complete' && !isActive &} {status === 'partial' && !isActive &&} {tab.label}" [map] (CaseFileShell.tsx:242)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
- **buttons**
  - "(no label)" type=— onClick=`{() => handleAnswerChange(q.key, opt.value)}` [map] [cond] (page.tsx:262)
  - "(no label)" type=— onClick=`{() => { let vals: string[] = []; try { const p = ` [map] [cond] (page.tsx:275)
  - "×" type=button onClick=`{() => removeAssetRow(i)}` [map] [cond] (page.tsx:388)
  - "+ Add another asset" type=button onClick=`{addAssetRow}` [cond] (page.tsx:410)
  - "Back to case file" type=submit(default) onClick=`{handleBack}` (CaseFileShell.tsx:118)
  - "Preview" type=submit(default) onClick=`{() => setPreviewOpen(!previewOpen)}` (CaseFileShell.tsx:184)
  - "{nextCluster ? `Next: ${nextCluster.l}" type=submit(default) onClick=`{handleNext}` (CaseFileShell.tsx:205)
  - "{isComplete ? ( <svg width="10" heigh} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:311)
  - "{cluster.status === 'complete' ? '✓ '} {cluster.label}" type=submit(default) onClick=`{() => onClusterChange(cluster.id)}` [map] (CaseFileShell.tsx:426)
  - "See document" type=submit(default) onClick=`{() => setMobilePreviewOpen(true)}` (CaseFileShell.tsx:457)
  - "Close preview" type=submit(default) onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:546)
  - "Close preview" type=submit(default) onClick=`{() => setMobilePreviewOpen(false)}` [cond] (CaseFileShell.tsx:590)
  - "Dismiss coaching nudge" type=submit(default) onClick=`{handleDismiss}` (SimulatorNudge.tsx:128)
  - "{recording ? ( <svg width="13" height} {transcribing ? 'Transcribing…' : rec}" type=button onClick=`{handleMicClick}` disabled=`{transcribing}` [cond] (TextArea.tsx:166)
  - "{label}" type=button onClick=`{onClick}` disabled=`{disabled}` (OptionButton.tsx:12)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
- **non-button click handlers**
  - <div> "" onClick=`{() => setPreviewOpen(false)}` [cond] (CaseFileShell.tsx:515)
- **inputs**
  - TextArea name=— id=— [map] [cond] (page.tsx:301)
  - text name=— id=— placeholder="{placeholder}" (TextInput.tsx:20)
  - textarea name=— id=— placeholder="{placeholder}" (TextArea.tsx:135)
  - text name=— id=— placeholder="{placeholder \|\| '0'}" (CurrencyInput.tsx:49)
- **API calls**
  - POST `/api/answers` (page.tsx:173)
  - GET `/api/apply/section-completion` (CaseFileShell.tsx:69)
  - GET `/api/simulator/section-nudge?section={…}` (SimulatorNudge.tsx:25)
  - POST `/api/simulator/transcribe` (TextArea.tsx:88)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:319)
  - router.push → `{prevSectionPath}` (CaseFileShell.tsx:82)
  - router.push → `{nextSectionPath}` (CaseFileShell.tsx:89)
- **browser storage keys**: `{dismissKey}`

## `/apply/upload/gaps`

- file: `src/app/apply/upload/gaps/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `GapReportClient.tsx`
- **links**
  - /apply ← "Return to case file" (page.tsx:21)
  - /apply ← "Return to case file" (GapReportClient.tsx:106)
  - /apply/upload ← "&larr; Back to upload" (GapReportClient.tsx:122)
- **buttons**
  - "Complete my case file →" type=submit(default) onClick=`{() => router.push('/apply')}` (GapReportClient.tsx:376)
- **API calls**
  - GET `/api/documents/gap-report?applicationId={…}` (GapReportClient.tsx:63)
- **programmatic navigation**
  - router.push → `/apply` (GapReportClient.tsx:377)
- **browser storage keys**: `gap-report-{…}`

## `/apply/upload`

- file: `src/app/apply/upload/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `UploadClient.tsx`
- **links**
  - /pricing ← "Unlock Complete — $1,495" (page.tsx:69)
  - /dashboard ← "← Back to dashboard" (page.tsx:76)
  - /apply ← "&larr; Back to case file" (UploadClient.tsx:198)
  - /case-profile ← "View or replace on case profile →" [cond] (UploadClient.tsx:273)
  - /settings ← "Settings" (UploadClient.tsx:298)
- **buttons**
  - "Drag and drop files here, or click to browse .pdf, .docx, .csv &mdash; max 10MB each, up t" type=button onClick=`{handleBrowse}` (UploadClient.tsx:303)
  - "Remove" type=submit(default) onClick=`{(e) => { e.stopPropagation(); removeFile(f.id); }` [map] [cond] (UploadClient.tsx:441)
  - "{uploading ? 'Uploading...' : 'Read m}" type=submit(default) onClick=`{handleUpload}` disabled=`{!canProcess}` [cond] (UploadClient.tsx:517)
- **inputs**
  - file name=— id=— (UploadClient.tsx:354)
  - select name=— id=— [map] [cond] (UploadClient.tsx:477)
- **API calls**
  - POST `/api/documents` (UploadClient.tsx:170)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:24)
  - router.push → `/apply/upload/processing?docs={…}&app={…}` (UploadClient.tsx:183)

## `/apply/upload/processing`

- file: `src/app/apply/upload/processing/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `ProcessingClient.tsx`
- **links**
  - /apply/upload ← "Return to upload" (page.tsx:23)
- **buttons**
  - "Return to case file" type=submit(default) onClick=`{() => router.push('/apply')}` [cond] (ProcessingClient.tsx:232)
- **API calls**
  - POST `/api/documents/extract` (ProcessingClient.tsx:40)
- **programmatic navigation**
  - router.push → `/apply/upload/review?app={…}` (ProcessingClient.tsx:135)
  - router.push → `/apply/upload/gaps?app={…}` (ProcessingClient.tsx:137)
  - router.push → `/apply` (ProcessingClient.tsx:233)
- **browser storage keys**: `gap-report-{…}`

## `/apply/upload/review`

- file: `src/app/apply/upload/review/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `DiscrepancyReviewClient.tsx`
- **links**
  - /apply ← "Return to case file" (page.tsx:21)
  - /apply/upload ← "&larr; Back to upload" (DiscrepancyReviewClient.tsx:145)
- **buttons**
  - "{resolving ? 'Resolving...' : 'Contin}" type=submit(default) onClick=`{handleResolveAll}` disabled=`{!allResolved \|\| resolving}` (DiscrepancyReviewClient.tsx:352)
- **inputs**
  - radio name=disc-{…} id=— [map] (DiscrepancyReviewClient.tsx:250)
  - radio name=disc-{…} id=— [map] (DiscrepancyReviewClient.tsx:294)
  - text name=— id=— placeholder="Enter value..." [map] (DiscrepancyReviewClient.tsx:312)
- **API calls**
  - POST `/api/documents/resolve-discrepancy` (DiscrepancyReviewClient.tsx:103)
- **programmatic navigation**
  - router.push → `/login` (DiscrepancyReviewClient.tsx:35)
  - router.push → `/apply/upload/gaps?app={…}` (DiscrepancyReviewClient.tsx:121)
- **browser storage keys**: `gap-report-{…}`

## `/case-profile`

- file: `src/app/case-profile/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `CaseProfilePage.tsx`, `CaseProfilePageClassic.tsx`, `CaseProfileNew.tsx`, `DocumentImportHub.tsx`, `ControlPanel.tsx`, `PartnerInvitePanel.tsx`, `ComingSoonNotifyButton.tsx`, `CaseHeader.tsx`, `CardGrid.tsx`, `CardDrawer.tsx`, `NameEditPanel.tsx`, `FamilyMembersPanel.tsx`, `ProgressRing.tsx`, `StatusChip.tsx`
- **links**
  - #{…} ← "{num} {label}" [map] (CaseProfilePageClassic.tsx:130)
  - {href} ← "→" [cond] (CaseProfilePageClassic.tsx:338)
  - {ctaHref} ← "{ctaLabel} →" [cond] (CaseProfilePageClassic.tsx:510)
  - {done ? "#" : href} ← "{label}" (CaseProfilePageClassic.tsx:817)
  - /apply/dependent/{…} ← "Complete {m.first_name \|\| "their"} DS-160 details →" [cond] (CaseProfilePageClassic.tsx:1184)
  - {m.href} ← "" [map] (CaseProfilePageClassic.tsx:2076)
  - {milestones[activeIndex].href} ← "Continue →" [cond] (CaseProfilePageClassic.tsx:2088)
  - /apply/story ← "{nameEditOpen ? "Close" : "Edit Name"} {NameEditForm} Family Members & Co-Applicants {(isP" (CaseProfilePageClassic.tsx:2129)
  - /apply/investment ← "" (CaseProfilePageClassic.tsx:2252)
  - /gap-analysis ← "{data.completenessScore != null && ( } {data.caseTheory && <CaseTheoryBlock } {isFranchise" (CaseProfilePageClassic.tsx:2270)
  - /simulator/prep-kit ← "{data.simCoachingNotes && ( <div styl}" (CaseProfilePageClassic.tsx:2298)
  - /apply/partner2?applicationId={…} ← "Complete →" [cond] (CaseProfilePageClassic.tsx:2392)
  - /apply/partner2?applicationId={…} ← "Complete →" [cond] (CaseProfileNew.tsx:165)
  - {tile.href} ← "{tile.label} {tile.description}" (ControlPanel.tsx:44)
  - {nextBestAction.href} ← "{nextBestAction.label} ~ {nextBestAction.estimateMin} min" [cond] (CaseHeader.tsx:80)
  - {field.href} ← "Edit" [map] [cond] (CardDrawer.tsx:207)
  - {field.href} ← "Review" [map] [cond] (CardDrawer.tsx:226)
  - {field.href} ← "Answer" [map] [cond] (CardDrawer.tsx:238)
  - /apply/dependent/{…} ← "Complete {m.first_name \|\| 'their'} DS-160 details →" [cond] (FamilyMembersPanel.tsx:243)
- **buttons**
  - "{saving ? "…" : "Save"}" type=submit(default) onClick=`{handleSave}` disabled=`{saving}` (CaseProfilePageClassic.tsx:271)
  - "Cancel" type=submit(default) onClick=`{() => { setIsEditing(false); setDraft(value ?? ""` (CaseProfilePageClassic.tsx:288)
  - "{status === "have" ? "edit" : "enter"}" type=submit(default) onClick=`{() => setIsEditing(true)}` [cond] (CaseProfilePageClassic.tsx:347)
  - "{deletingId === doc.id ? "Deleting…" }" type=submit(default) onClick=`{() => handleDelete(doc)}` disabled=`{deletingId === doc.id}` [map] (CaseProfilePageClassic.tsx:627)
  - "{nameSaving ? "Saving…" : "Save"}" type=submit(default) onClick=`{handleSaveName}` disabled=`{nameSaving}` [cond] (CaseProfilePageClassic.tsx:1063)
  - "Cancel" type=submit(default) onClick=`{() => { setNameEditOpen(false); setNameError(null` [cond] (CaseProfilePageClassic.tsx:1066)
  - "{memberSaving ? "Saving…" : "Save"}" type=submit(default) onClick=`{handleSaveMember}` disabled=`{memberSaving}` (CaseProfilePageClassic.tsx:1129)
  - "Cancel" type=submit(default) onClick=`{cancelMemberForm}` (CaseProfilePageClassic.tsx:1132)
  - "{caseData.documents.length} document {caseData.documents.length !== 1 ? "s} {showDocs ? "▲" type=submit(default) onClick=`{toggleShowDocs}` [cond] (CaseProfilePageClassic.tsx:1173)
  - "Edit" type=submit(default) onClick=`{() => openEditMember(m)}` (CaseProfilePageClassic.tsx:1193)
  - "Remove" type=submit(default) onClick=`{() => handleDeleteMember(m.id)}` (CaseProfilePageClassic.tsx:1194)
  - "{nameEditOpen ? "Close" : "Edit Name"}" type=submit(default) onClick=`{() => { setNameForm({ firstName: data.firstName ?` (CaseProfilePageClassic.tsx:2141)
  - "+ Add Co-Investor" type=submit(default) onClick=`{() => openAddMember("co_investor")}` [cond] (CaseProfilePageClassic.tsx:2173)
  - "+ Add Spouse" type=submit(default) onClick=`{() => openAddMember("spouse")}` [cond] (CaseProfilePageClassic.tsx:2189)
  - "+ Add Child" type=submit(default) onClick=`{() => openAddMember("child")}` [cond] (CaseProfilePageClassic.tsx:2205)
  - "+ Add {type === "co_investor" ? "Co-Investo}" type=submit(default) onClick=`{() => openAddMember(type)}` [map] [cond] (CaseProfilePageClassic.tsx:2221)
  - "08 Coming Soon Renewal Package Not yet available — we&apos;re launching new applications f" type=— onClick=`—` (CaseProfilePageClassic.tsx:2377)
  - "Renewal Coming Soon Renewal Package Not yet available — we&apos;re launching new applicati" type=— onClick=`—` (CaseProfileNew.tsx:150)
  - "Import from documents Upload a resume, FDD, passport, or birth certificate — for you or a " type=submit(default) onClick=`{() => setIsOpen(true)}` (DocumentImportHub.tsx:647)
  - "✕" type=submit(default) onClick=`{() => { reset(); setIsOpen(false); }}` (DocumentImportHub.tsx:690)
  - "+ Add files" type=submit(default) onClick=`{() => openFilePickerFor(opt.id)}` [map] [cond] (DocumentImportHub.tsx:733)
  - "✕" type=submit(default) onClick=`{() => removeFromQueue(item.id)}` [map] [cond] (DocumentImportHub.tsx:788)
  - "+ Add a family member" type=submit(default) onClick=`{() => setShowAddMember(true)}` [cond] (DocumentImportHub.tsx:805)
  - "{addingMember ? 'Adding…' : 'Add'}" type=submit(default) onClick=`{handleAddMember}` disabled=`{!newMemberName.trim() \|\| addingMember}` [cond] (DocumentImportHub.tsx:839)
  - "Cancel" type=submit(default) onClick=`{() => { setShowAddMember(false); setNewMemberName` [cond] (DocumentImportHub.tsx:847)
  - "Extract fields from {queue.length} file {queue.length !== 1 ? 's' : ''} →" type=submit(default) onClick=`{handleExtractAll}` [cond] (DocumentImportHub.tsx:859)
  - "Move to their section" type=submit(default) onClick=`{() => reassignOwner(item.id, m.matchedIsPrincipal` [map] [cond] (DocumentImportHub.tsx:1045)
  - "Review {merged.length} field {merged.length !== 1 ? 's' : ''} →" type=submit(default) onClick=`{() => setStage('reviewing')}` [cond] (DocumentImportHub.tsx:1062)
  - "Start over" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1069)
  - "{isChosen && <div style={{ width: '5p} {src.value} from {src.fileName}" type=submit(default) onClick=`{() => setConflictChoice(entryKey, src.value)}` [map] [cond] (DocumentImportHub.tsx:1130)
  - "{isManual && <div style={{ width: '5p} Enter manually" type=submit(default) onClick=`{() => setConflictChoice(entryKey, '__manual__')}` [map] [cond] (DocumentImportHub.tsx:1156)
  - "{isAccepted && ( <svg width="9" heigh} {field.label} {field.sources.length > 0 && ( <span " type=button onClick=`{() => toggleAccepted(entryKey)}` [map] [cond] (DocumentImportHub.tsx:1200)
  - "{unresolvedConflicts > 0 ? `Resolve $}" type=submit(default) onClick=`{handleApply}` disabled=`{applyCount === 0 \|\| unresolvedConflicts` [cond] (DocumentImportHub.tsx:1246)
  - "Select all non-conflicts" type=submit(default) onClick=`{() => { setAccepted(new Set(merged.filter(f => !f` [cond] (DocumentImportHub.tsx:1256)
  - "Start over" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1265)
  - "Close" type=submit(default) onClick=`{() => { reset(); setIsOpen(false); }}` [cond] (DocumentImportHub.tsx:1302)
  - "Import more documents" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1309)
  - "Try again" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1325)
  - "Resend or change email →" type=submit(default) onClick=`{() => setStatus("idle")}` [cond] (PartnerInvitePanel.tsx:76)
  - "{status === "sending" ? "Sending…" : }" type=submit(default) onClick=`{handleSend}` disabled=`{status === "sending"}` [cond] (PartnerInvitePanel.tsx:116)
  - "{state === 'loading' ? 'Sending…' : s}" type=button onClick=`{handleClick}` disabled=`{state === 'loading'}` (ComingSoonNotifyButton.tsx:52)
  - "{def.label} {noteFor(cardId, card)}" type=button onClick=`{locked ? undefined : onClick}` disabled=`{locked}` (CardGrid.tsx:58)
  - "×" type=button onClick=`{onClose}` (CardDrawer.tsx:119)
  - "{p.name}" type=button onClick=`{() => setPersonId(p.id)}` [map] [cond] (CardDrawer.tsx:132)
  - "{savingKey === field.key ? 'Confirmin}" type=button onClick=`{() => handleConfirm(field)}` disabled=`{savingKey === field.key}` [map] [cond] (CardDrawer.tsx:189)
  - "Upload a document instead" type=button onClick=`{() => onUploadRequested()}` [map] [cond] (CardDrawer.tsx:244)
  - "{open ? 'Close' : 'Edit Name'}" type=submit(default) onClick=`{toggleOpen}` (NameEditPanel.tsx:56)
  - "{saving ? 'Saving…' : 'Save'}" type=submit(default) onClick=`{handleSave}` disabled=`{saving}` [cond] (NameEditPanel.tsx:100)
  - "Cancel" type=submit(default) onClick=`{() => { setOpen(false); setError(null); }}` [cond] (NameEditPanel.tsx:107)
  - "{memberSaving ? 'Saving…' : 'Save'}" type=submit(default) onClick=`{handleSaveMember}` disabled=`{memberSaving}` (FamilyMembersPanel.tsx:183)
  - "Cancel" type=submit(default) onClick=`{cancelMemberForm}` (FamilyMembersPanel.tsx:186)
  - "{caseData.documents.length} document {caseData.documents.length !== 1 ? 's} {showDocs ? '▲" type=submit(default) onClick=`{() => toggleShowDocs(m.id)}` [cond] (FamilyMembersPanel.tsx:219)
  - "Edit" type=submit(default) onClick=`{() => openEditMember(m)}` (FamilyMembersPanel.tsx:252)
  - "Remove" type=submit(default) onClick=`{() => handleDeleteMember(m.id)}` (FamilyMembersPanel.tsx:253)
  - "+ Add Co-Investor" type=submit(default) onClick=`{() => openAddMember('co_investor')}` [cond] (FamilyMembersPanel.tsx:275)
  - "+ Add Spouse" type=submit(default) onClick=`{() => openAddMember('spouse')}` [cond] (FamilyMembersPanel.tsx:290)
  - "+ Add Child" type=submit(default) onClick=`{() => openAddMember('child')}` [cond] (FamilyMembersPanel.tsx:305)
  - "+ Add {type === 'co_investor' ? 'Co-Investo}" type=submit(default) onClick=`{() => openAddMember(type)}` [map] [cond] (FamilyMembersPanel.tsx:320)
- **non-button click handlers**
  - <CardTile> "" onClick=`{() => onCardClick(id)}` [map] (CardGrid.tsx:120)
  - <div> "{CARD_CATEGORY_LABELS[def.category]} {def.label} × {showPersonTabs && ( <div style={{ di} " onClick=`{onClose}` (CardDrawer.tsx:95)
- **inputs**
  - text(default) name=— id=— placeholder="{placeholder}" (CaseProfilePageClassic.tsx:252)
  - text name=— id=— [map] [cond] (CaseProfilePageClassic.tsx:1052)
  - text name=— id=— [map] (CaseProfilePageClassic.tsx:1088)
  - date name=— id=— (CaseProfilePageClassic.tsx:1096)
  - select name=— id=— (CaseProfilePageClassic.tsx:1101)
  - text name=— id=— (CaseProfilePageClassic.tsx:1108)
  - text name=— id=— (CaseProfilePageClassic.tsx:1115)
  - select name=— id=— [cond] (CaseProfilePageClassic.tsx:1121)
  - file name=— id=— (DocumentImportHub.tsx:703)
  - select name=— id=— [map] [cond] (DocumentImportHub.tsx:767)
  - text name=— id=— placeholder="Full name" [cond] (DocumentImportHub.tsx:815)
  - select name=— id=— [cond] (DocumentImportHub.tsx:826)
  - text name=— id=— placeholder="Type the correct value…" [map] [cond] (DocumentImportHub.tsx:1175)
  - email name=— id=— placeholder="partner@example.com" [cond] (PartnerInvitePanel.tsx:99)
  - text name=— id=— [map] [cond] (NameEditPanel.tsx:89)
  - text name=— id=— [map] (FamilyMembersPanel.tsx:142)
  - date name=— id=— (FamilyMembersPanel.tsx:150)
  - select name=— id=— (FamilyMembersPanel.tsx:155)
  - text name=— id=— (FamilyMembersPanel.tsx:162)
  - text name=— id=— (FamilyMembersPanel.tsx:169)
  - select name=— id=— [cond] (FamilyMembersPanel.tsx:175)
- **API calls**
  - POST `/api/answers` (CardDrawer.tsx:75)
  - DELETE `/api/uploaded-documents/{…}` (CaseProfilePageClassic.tsx:560)
  - GET `/api/dashboard/case-profile` (CaseProfileNew.tsx:49)
  - GET `/api/profile/family-members` (FamilyMembersPanel.tsx:57)
  - PATCH `/api/profile/name` (NameEditPanel.tsx:30)
  - GET `{url}` (FamilyMembersPanel.tsx:100)
  - DELETE `/api/profile/family-members/{…}` (FamilyMembersPanel.tsx:114)
  - GET `/api/case/completion` (CaseProfileNew.tsx:36)
  - POST `/api/profile/family-members` (DocumentImportHub.tsx:339)
  - POST `/api/partner/invite` (PartnerInvitePanel.tsx:26)
  - POST `/api/coming-soon-interest` (ComingSoonNotifyButton.tsx:22)
  - GET `/api/case/completion?{…}` (CardDrawer.tsx:44)
- **programmatic navigation**
  - redirect → `/login` (page.tsx:10)

## `/dashboard`

- file: `src/app/dashboard/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - redirect → `/case-profile` (page.tsx:7)

## `/documents/[applicationId]`

- file: `src/app/documents/[applicationId]/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getSession
- component files: `page.tsx`, `PackageSummary.tsx`, `DocumentAuditPanel.tsx`
- **links**
  - {card.href} ← "{card.label} {card.status}" [map] (page.tsx:481)
  - {dim.editLink} ← "{dim.editLinkLabel \|\| "Edit this sect}" [map] [cond] (PackageSummary.tsx:673)
- **buttons**
  - "Retry" type=submit(default) onClick=`{fetchAll}` (page.tsx:362)
  - "Dismiss" type=submit(default) onClick=`{dismissImpact}` disabled=`{dismissingImpact}` [cond] (page.tsx:422)
  - "Request New Draft" type=submit(default) onClick=`{() => { openModal(doc); setRegenForm((prev) => ({` [map] [cond] (page.tsx:584)
  - "Request New Draft" type=submit(default) onClick=`{() => { openModal(doc); setRegenForm((prev) => ({` [map] [cond] (page.tsx:600)
  - "Read &amp; Certify" type=submit(default) onClick=`{() => openModal(doc)}` [map] [cond] (page.tsx:617)
  - "Request New Draft" type=submit(default) onClick=`{() => { openModal(doc); setRegenForm((prev) => ({` [map] [cond] (page.tsx:624)
  - "{downloadState === "locked" && "Compl} {downloadState === "downloading" && "} {downloadSta" type=submit(default) onClick=`{async () => { if (downloadState !== "ready" && do` disabled=`{downloadState === "locked" \|\| downloadS` [cond] (page.tsx:791)
  - "✕" type=submit(default) onClick=`{closeModal}` [cond] (page.tsx:949)
  - "Back" type=submit(default) onClick=`{() => setRegenForm((prev) => ({ ...prev, open: fa` disabled=`{regenForm.submitting}` [cond] (page.tsx:981)
  - "{regenForm.submitting ? "Submitting…"}" type=submit(default) onClick=`{submitRegen}` disabled=`{regenForm.submitting}` [cond] (page.tsx:990)
  - "Request a New Draft" type=submit(default) onClick=`{() => setRegenForm((prev) => ({ ...prev, open: tr` [cond] (page.tsx:1042)
  - "{certifying === modal.document.docume}" type=submit(default) onClick=`{() => certifyDocument(modal.document!.document_ty` disabled=`{isCertified(modal.document) \|\| certifyi` [cond] (page.tsx:1058)
  - "{summaryLabel} {!clean && ( <span style={{ fontSize:}" type=submit(default) onClick=`{() => setOpen(o => !o)}` (DocumentAuditPanel.tsx:291)
  - "Fix with revision →" type=submit(default) onClick=`{() => onRequestRevision(finding.revisionPrompt)}` [map] [cond] (DocumentAuditPanel.tsx:352)
- **non-button click handlers**
  - <div> "{docLabel(modal.document)} {docTab(modal.document)} {modal.document.page_estimate && ( <s}" onClick=`{closeModal}` [cond] (page.tsx:925)
  - <div> "{docLabel(modal.document)} {docTab(modal.document)} {modal.document.page_estimate && ( <s}" onClick=`{(e) => e.stopPropagation()}` [cond] (page.tsx:929)
- **inputs**
  - checkbox name=— id=— [map] [cond] (page.tsx:747)
  - checkbox name=— id=— [cond] (page.tsx:771)
  - textarea name=— id=— placeholder="e.g. The investment breakdown is missing" [cond] (page.tsx:970)
- **API calls**
  - GET `/api/profile/outcomes-consent` (page.tsx:113)
  - POST `/api/profile/outcomes-consent` (page.tsx:125)
  - GET `/api/generate/documents/{…}` (page.tsx:143)
  - GET `/api/dashboard/package-manifest?applicationId={…}` (page.tsx:215)
  - GET `/api/dashboard/change-impact?applicationId={…}` (page.tsx:147)
  - GET `/api/simulator/prep-kit` (page.tsx:172)
  - POST `/api/dashboard/certify-document` (page.tsx:195)
  - POST `/api/dashboard/request-regeneration` (page.tsx:234)
  - DELETE `/api/dashboard/change-impact?applicationId={…}` (page.tsx:268)
  - GET `/api/generate/download/{…}` (page.tsx:801)
  - GET `/api/generate/case-brief/{…}` (PackageSummary.tsx:238)
- **browser storage keys**: `supabase_user`
- **download / print**: window.URL.createObjectURL

## `/documents/debug-error`

- file: `src/app/documents/debug-error/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`

## `/documents`

- file: `src/app/documents/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **programmatic navigation**
  - redirect → `/login?next=/documents` (page.tsx:9)
  - redirect → `/documents/{…}` (page.tsx:21)
  - redirect → `/case-profile` (page.tsx:24)

## `/early-access`

- file: `src/app/early-access/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `FaqWidget.tsx`, `FaqChat.tsx`, `animated-gradient-border.tsx`
- **links**
  - /quiz ← "Get a personalised eligibility picture →" [map] [cond] (FaqChat.tsx:333)
- **buttons**
  - "{c}" type=button onClick=`{() => selectCountry(c)}` [map] [cond] (page.tsx:180)
  - "{submitting ? 'Submitting…' : 'Join e}" type=submit onClick=`—` disabled=`{submitting \|\| !canSubmit}` (page.tsx:244)
  - "{chip}" type=submit(default) onClick=`{() => handleSubmit(chip)}` [map] [cond] (FaqChat.tsx:307)
  - "→" type=submit(default) onClick=`{() => handleSubmit()}` disabled=`{!query.trim() \|\| isStreaming}` (FaqChat.tsx:406)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:115)
- **inputs**
  - text name=— id=— required placeholder="Your full name" (page.tsx:119)
  - email name=— id=— required placeholder="you@example.com" (page.tsx:132)
  - text name=— id=— required placeholder="Search your country of residence…" (page.tsx:145)
  - select name=— id=— required (page.tsx:213)
  - text name=— id=company (page.tsx:229)
  - text name=— id=— placeholder="{inputPlaceholder}" (FaqChat.tsx:381)
- **API calls**
  - POST `/api/early-access` (page.tsx:69)
  - POST `/api/faq/ask` (FaqChat.tsx:168)

## `/fdd/compare`

- file: `src/app/fdd/compare/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "← Back to analyses" type=submit(default) onClick=`{() => router.push('/fdd')}` (page.tsx:252)
  - "Return to FDD hub" type=submit(default) onClick=`{() => router.push('/fdd')}` [cond] (page.tsx:269)
  - "{selecting === col.id ? 'Selecting…' }" type=submit(default) onClick=`{() => selectAsPrimary(col)}` disabled=`{selecting === col.id}` [map] [cond] (page.tsx:322)
- **API calls**
  - POST `/api/answers` (page.tsx:191)
  - POST `/api/fdd/compare` (page.tsx:212)
- **programmatic navigation**
  - router.push → `/fdd/{…}/score` (page.tsx:196)
  - router.push → `/fdd` (page.tsx:253)
  - router.push → `/fdd` (page.tsx:269)

## `/fdd`

- file: `src/app/fdd/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **buttons**
  - "{compareMode && ( <div className={`mt} {franchiseName} {analysis.target_city ? `${analysis" type=submit(default) onClick=`{handleClick}` (page.tsx:57)
  - "Compare" type=submit(default) onClick=`{() => setCompareMode(true)}` [cond] (page.tsx:168)
  - "+ New analysis" type=submit(default) onClick=`{() => router.push('/fdd/upload')}` (page.tsx:176)
  - "Cancel" type=submit(default) onClick=`{exitCompareMode}` [cond] (page.tsx:193)
  - "Analyse an FDD" type=submit(default) onClick=`{() => router.push('/fdd/upload')}` [cond] (page.tsx:218)
  - "Compare {selected.length} franchises" type=submit(default) onClick=`{goCompare}` [cond] (page.tsx:253)
- **programmatic navigation**
  - router.push → `/fdd/report/{…}` (page.tsx:35)
  - router.push → `/fdd/questions/{…}` (page.tsx:37)
  - router.push → `/fdd/territory/{…}` (page.tsx:39)
  - router.push → `/fdd/score/{…}` (page.tsx:41)
  - router.push → `/fdd/review/{…}` (page.tsx:43)
  - router.push → `/fdd/compare?ids={…}` (page.tsx:152)
  - router.push → `/fdd/upload` (page.tsx:177)
  - router.push → `/fdd/upload` (page.tsx:219)

## `/fdd/questions/[fddId]`

- file: `src/app/fdd/questions/[fddId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `GenerationProgress.tsx`
- **buttons**
  - "{index + 1} . {aud.label} {isCritical && ( <span className="tex} {question.category} {ques" type=submit(default) onClick=`{() => setExpanded(x => !x)}` (page.tsx:42)
  - "Try again" type=submit(default) onClick=`{runQuestionGeneration}` (page.tsx:250)
  - "All ( {result.total_count} )" type=submit(default) onClick=`{() => setActiveAudience('all')}` (page.tsx:319)
  - "{AUDIENCE_CONFIG[aud].label.replace('} ( {count} )" type=submit(default) onClick=`{() => setActiveAudience(aud)}` [map] [cond] (page.tsx:331)
  - "{copyFeedback \|\| 'Copy all as text'}" type=submit(default) onClick=`{handleCopyAll}` (page.tsx:345)
  - "← Back to Score" type=submit(default) onClick=`{() => router.push(`/fdd/score/${fddId}`)}` (page.tsx:362)
  - "View Full Report →" type=submit(default) onClick=`{() => router.push(`/fdd/report/${fddId}`)}` (page.tsx:368)
- **API calls**
  - POST `/api/fdd/questions` (page.tsx:190)
- **programmatic navigation**
  - router.push → `/fdd/score/{…}` (page.tsx:363)
  - router.push → `/fdd/report/{…}` (page.tsx:369)

## `/fdd/report/[fddId]`

- file: `src/app/fdd/report/[fddId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `GenerationProgress.tsx`
- **links**
  - /apply ← "Start E-2 application" [cond] (page.tsx:815)
- **buttons**
  - "Print / PDF" type=submit(default) onClick=`{onPrint}` (page.tsx:123)
  - "Download PDF" type=submit(default) onClick=`{() => window.open(`/api/fdd/report/pdf?fdd_id=${f` (page.tsx:126)
  - "Import to Case File" type=submit(default) onClick=`{onImport}` (page.tsx:443)
  - "{label}" type=submit(default) onClick=`{() => router.push(href)}` [map] (page.tsx:460)
  - "Print / PDF" type=submit(default) onClick=`{onPrint}` (page.tsx:512)
  - "Download PDF" type=submit(default) onClick=`{() => window.open(`/api/fdd/report/pdf?fdd_id=${f` (page.tsx:515)
  - "{label}" type=submit(default) onClick=`{() => router.push(href)}` [map] (page.tsx:583)
  - "{upgrading ? 'Redirecting to checkout}" type=submit(default) onClick=`{onUpgrade}` disabled=`{upgrading}` (page.tsx:656)
  - "Import findings" type=submit(default) onClick=`{handleImport}` [cond] (page.tsx:739)
  - "Cancel" type=submit(default) onClick=`{onClose}` [cond] (page.tsx:746)
  - "Close" type=submit(default) onClick=`{onClose}` [cond] (page.tsx:792)
  - "Close" type=submit(default) onClick=`{onClose}` [cond] (page.tsx:822)
  - "Dismiss" type=submit(default) onClick=`{onClose}` [cond] (page.tsx:836)
  - "Dismiss" type=submit(default) onClick=`{() => setError('')}` (page.tsx:976)
- **non-button click handlers**
  - <div> "{state === 'confirm' && ( <> <p class} {state === 'loading' && ( <div classN} {state === '" onClick=`{onClose}` (page.tsx:718)
- **API calls**
  - POST `/api/fdd/writeback` (page.tsx:697)
  - POST `/api/fdd/report` (page.tsx:892)
  - POST `/api/stripe/create-checkout` (page.tsx:913)
- **programmatic navigation**
  - window.open → `/api/fdd/report/pdf?fdd_id={…}` (page.tsx:127)
  - router.push → `{href}` (page.tsx:462)
  - window.open → `/api/fdd/report/pdf?fdd_id={…}` (page.tsx:516)
  - router.push → `{href}` (page.tsx:583)
  - location.href = → `{json.url}` (page.tsx:925)
- **download / print**: window.print, window.print

## `/fdd/review/[fddId]`

- file: `src/app/fdd/review/[fddId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **buttons**
  - "{section.label} {sectionLowConf > 0 && ( <span classN} {isOpen ? '▲' : '▼'}" type=submit(default) onClick=`{() => toggleSection(section.id)}` [map] (page.tsx:323)
  - "Continue to E-2 Scoring →" type=submit(default) onClick=`{() => router.push(`/fdd/score/${fddId}`)}` (page.tsx:405)
- **programmatic navigation**
  - router.push → `/fdd/upload` (page.tsx:221)
  - router.push → `/fdd/score/{…}` (page.tsx:406)

## `/fdd/score/[fddId]`

- file: `src/app/fdd/score/[fddId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `ProfileMatchPanel.tsx`, `GenerationProgress.tsx`
- **buttons**
  - "{dim.name} {cfg.label} ▾" type=submit(default) onClick=`{() => setExpanded(x => !x)}` (page.tsx:72)
  - "Try again" type=submit(default) onClick=`{runScoring}` (page.tsx:388)
  - "Run E-2 Analysis" type=submit(default) onClick=`{runScoring}` (page.tsx:410)
  - "{scoring ? 'Running…' : 'Re-run E-2 a}" type=submit(default) onClick=`{runScoring}` disabled=`{scoring}` [cond] (page.tsx:514)
  - "← Back to extraction" type=submit(default) onClick=`{() => router.push(`/fdd/review/${fddId}`)}` (page.tsx:528)
  - "Generate Questions →" type=submit(default) onClick=`{() => router.push(`/fdd/questions/${fddId}`)}` (page.tsx:534)
  - "{DIM_LABELS[key] ?? dim.name} {gcfg.label} ▾" type=submit(default) onClick=`{() => setExpanded(isOpen ? null : key)}` [map] (ProfileMatchPanel.tsx:206)
- **non-button click handlers**
  - <div> "You have {dim.investor_value} Required {dim.requirement} {dim.gap && ( <div className="bg-" onClick=`{e => e.stopPropagation()}` [map] [cond] (ProfileMatchPanel.tsx:221)
- **inputs**
  - select name=— id=— [map] [cond] (ProfileMatchPanel.tsx:250)
  - text name=— id=— placeholder="{f.placeholder}" [map] [cond] (ProfileMatchPanel.tsx:267)
- **API calls**
  - POST `/api/fdd/score` (page.tsx:348)
- **programmatic navigation**
  - router.push → `/fdd/review/{…}` (page.tsx:529)
  - router.push → `/fdd/questions/{…}` (page.tsx:535)

## `/fdd/territory/[fddId]`

- file: `src/app/fdd/territory/[fddId]/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `GenerationProgress.tsx`
- **buttons**
  - "Try again" type=submit(default) onClick=`{runTerritoryAnalysis}` (page.tsx:249)
  - "Print / PDF" type=submit(default) onClick=`{() => window.print()}` (page.tsx:285)
  - "← Back to E-2 Score" type=submit(default) onClick=`{() => router.push(`/fdd/score/${fddId}`)}` (page.tsx:405)
  - "Generate Questions →" type=submit(default) onClick=`{() => router.push(`/fdd/questions/${fddId}`)}` (page.tsx:411)
- **API calls**
  - POST `/api/fdd/territory` (page.tsx:209)
- **programmatic navigation**
  - router.push → `/fdd/score/{…}` (page.tsx:406)
  - router.push → `/fdd/questions/{…}` (page.tsx:412)
- **download / print**: window.print

## `/fdd/upload`

- file: `src/app/fdd/upload/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "View FDD analysis →" type=submit(default) onClick=`{() => router.push(`/fdd/report/${existingFdd.id}`` [cond] (page.tsx:276)
  - "View E-2 score →" type=submit(default) onClick=`{() => router.push(`/fdd/score/${existingFdd.id}`)` [cond] (page.tsx:282)
  - "Upload a different FDD instead" type=submit(default) onClick=`{() => setShowIntakeAnyway(true)}` [cond] (page.tsx:288)
  - "Continue to upload →" type=submit(default) onClick=`{() => setShowIntakeAnyway(true)}` [cond] (page.tsx:308)
  - "{label} {desc}" type=submit(default) onClick=`{() => setTransactionType(val)}` [map] [cond] (page.tsx:331)
  - "{selectedFile ? ( <div> <div classNam}" type=button onClick=`{() => fileInputRef.current?.click()}` [cond] (page.tsx:389)
  - "Upload &amp; Begin Extraction" type=submit(default) onClick=`{handleSubmit}` disabled=`{!selectedFile \|\| !targetState}` [cond] (page.tsx:435)
- **inputs**
  - text(default) name=— id=— placeholder="City" [cond] (page.tsx:353)
  - select name=— id=— [cond] (page.tsx:359)
  - text(default) name=— id=— placeholder="ZIP" [cond] (page.tsx:369)
  - file name=— id=— [cond] (page.tsx:420)
- **API calls**
  - POST `/api/fdd/upload` (page.tsx:152)
  - POST `/api/fdd/extract` (page.tsx:170)
- **programmatic navigation**
  - router.push → `/fdd/review/{…}` (page.tsx:234)
  - router.push → `/fdd/report/{…}` (page.tsx:277)
  - router.push → `/fdd/score/{…}` (page.tsx:283)

## `/forgot-password`

- file: `src/app/forgot-password/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.resetPasswordForEmail
- component files: `page.tsx`
- **links**
  - / ← "E2go.app" (page.tsx:32)
  - /login ← "Back to Sign In" [cond] (page.tsx:41)
  - /login ← "Back to Sign In" [cond] (page.tsx:64)
- **buttons**
  - "Send Reset Link" type=submit(default) onClick=`{handleReset}` [cond] (page.tsx:58)
- **inputs**
  - email name=— id=— placeholder="Email address" [cond] (page.tsx:51)

## `/franchise/brand/[slug]`

- file: `src/app/franchise/brand/[slug]/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /franchise/matches ← "← Back to matches" (page.tsx:25)
  - /franchise/matches ← "← Back to matches" (page.tsx:46)
  - /franchise/connect ← "Request introduction →" (page.tsx:113)
  - /franchise/matches ← "← Back to all matches" (page.tsx:119)
- **API calls**
  - POST `/api/franchise/brand-view` (page.tsx:14)

## `/franchise/connect`

- file: `src/app/franchise/connect/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /dashboard ← "Back to dashboard →" (page.tsx:155)
  - /franchise/matches ← "← Back to matches" (page.tsx:170)
  - /franchise/matches ← "Cancel" (page.tsx:285)
- **buttons**
  - "{consent ? '✓' : ''}" type=submit(default) onClick=`{() => setConsent(c => !c)}` (page.tsx:238)
  - "{submitting ? 'Sending…' : 'Send intr}" type=submit(default) onClick=`{handleSubmit}` disabled=`{!consent \|\| submitting}` (page.tsx:266)
- **API calls**
  - POST `/api/answers` (page.tsx:111)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:43)

## `/franchise/discover`

- file: `src/app/franchise/discover/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /franchise ← "← Franchise Navigator" (page.tsx:281)
  - /quiz?step=investment ← "Update your eligibility quiz" [cond] (page.tsx:326)
- **buttons**
  - "{hasPrefill ? 'Looks right — continue}" type=submit(default) onClick=`{() => setStep('questions')}` (page.tsx:331)
  - "{selected && ( <span style={{ color: } {cat}" type=submit(default) onClick=`{() => toggleIndustry(cat)}` [map] [cond] (page.tsx:400)
  - "{industrySelected.length > 0 ? `Conti}" type=submit(default) onClick=`{() => setCurrentQ(1)}` [cond] (page.tsx:446)
  - "{QFN_QUESTIONS.map((qItem, i) => ( <b}" type=submit(default) onClick=`{() => setCurrentQ(0)}` [cond] (page.tsx:468)
  - "Go to question {…}" type=submit(default) onClick=`{() => setCurrentQ(i + 1)}` [map] [cond] (page.tsx:483)
  - "{option}" type=submit(default) onClick=`{() => selectOption(singleQ.answerKey, option)}` disabled=`{saving}` [map] [cond] (page.tsx:530)
  - "← Previous" type=submit(default) onClick=`{() => setCurrentQ(q => q - 1)}` [cond] (page.tsx:568)
  - "Skip →" type=submit(default) onClick=`{() => setCurrentQ(q => q + 1)}` [cond] (page.tsx:575)
  - "{QFN_QUESTIONS.map((qItem, i) => ( <b}" type=submit(default) onClick=`{() => setCurrentQ(0)}` [cond] (page.tsx:586)
  - "Go to question {…}" type=submit(default) onClick=`{() => setCurrentQ(i + 1)}` [map] [cond] (page.tsx:601)
  - "See my matches →" type=submit(default) onClick=`{handleFinish}` [cond] (page.tsx:629)
  - "See partial results with {answeredCount} answers →" type=submit(default) onClick=`{() => router.push('/franchise/matches')}` [cond] (page.tsx:654)
- **API calls**
  - POST `/api/answers` (page.tsx:218)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:158)
  - router.push → `/franchise/matches` (page.tsx:248)
  - router.push → `/franchise/matches` (page.tsx:255)
  - router.push → `/franchise/matches` (page.tsx:655)

## `/franchise/matches`

- file: `src/app/franchise/matches/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /franchise ← "← Franchise Navigator" (page.tsx:322)
  - /franchise/discover ← "complete your profile for better results →" [cond] (page.tsx:336)
  - /franchise/discover ← "Update my answers" (page.tsx:386)
  - /dashboard ← "← Dashboard" (page.tsx:392)
- **buttons**
  - "{state === 'loading' ? 'Sending…' : '}" type=submit(default) onClick=`{handleConnect}` disabled=`{state === 'loading'}` (page.tsx:173)
  - "Not right now" type=submit(default) onClick=`{() => setState('dismissed')}` disabled=`{state === 'loading'}` (page.tsx:193)
  - "← Back to profiler" type=submit(default) onClick=`{() => router.push('/franchise/discover')}` (page.tsx:307)
- **API calls**
  - POST `/api/franchise/broker-request` (page.tsx:131)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:236)
  - router.push → `/franchise/discover` (page.tsx:307)

## `/franchise`

- file: `src/app/franchise/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /quiz ← "Complete eligibility quiz first for best results" [cond] (page.tsx:199)
  - /dashboard ← "← Back to dashboard" (page.tsx:207)
- **buttons**
  - "Start matching →" type=submit(default) onClick=`{() => router.push('/franchise/discover')}` [cond] (page.tsx:163)
  - "Start matching →" type=submit(default) onClick=`{() => router.push('/franchise/discover')}` [cond] (page.tsx:182)
- **programmatic navigation**
  - router.push → `/franchise/discover` (page.tsx:164)
  - router.push → `/franchise/discover` (page.tsx:183)

## `/gap-analysis`

- file: `src/app/gap-analysis/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `DenialRiskRadar.tsx`, `CategoryCard.tsx`, `PathwaySection.tsx`, `GenerationProgress.tsx`, `RemediationPanel.tsx`
- **links**
  - /apply/story ← "Begin onboarding →" [cond] (page.tsx:359)
  - /quiz ← "Start eligibility quiz →" [cond] (page.tsx:368)
  - /dashboard ← "← Dashboard" (page.tsx:377)
  - /dashboard ← "← Dashboard" (page.tsx:393)
  - /dashboard ← "← Dashboard" (page.tsx:438)
  - /simulator?applicationId={…} ← "Simulator →" [cond] (page.tsx:442)
  - {def.href} ← "Update this field →" [map] [cond] (page.tsx:606)
  - /simulator?applicationId={…} ← "Practice in the Simulator" [cond] (page.tsx:724)
  - {D_CODE_FIX_LINKS[f.code].href} ← "Fix this → {D_CODE_FIX_LINKS[f.code].label}" [map] [cond] (DenialRiskRadar.tsx:170)
  - /simulator ← "Open Simulator →" [cond] (RemediationPanel.tsx:247)
  - /apply/business ← "Review business type →" [cond] (RemediationPanel.tsx:262)
- **buttons**
  - "{rebuilding ? 'Recalculating…' : '↻ R}" type=submit(default) onClick=`{recalculate}` disabled=`{rebuilding}` (page.tsx:456)
  - "{analysisRunning ? 'Running analysis…}" type=submit(default) onClick=`{runAIAnalysis}` disabled=`{analysisRunning}` [cond] (page.tsx:495)
  - "{analysisRunning ? 'Running…' : 'Re-r}" type=submit(default) onClick=`{() => { setShowReanalysisPrompt(false); runAIAnal` disabled=`{analysisRunning}` [cond] (page.tsx:642)
  - "×" type=submit(default) onClick=`{() => setShowReanalysisPrompt(false)}` [cond] (page.tsx:655)
  - "{f.code} {cfg.label} {f.name} {f.frequency} {!isOpen && f.risk !== 'low' && ( <sp}" type=button onClick=`{() => setExpanded(isOpen ? null : f.code)}` [map] (DenialRiskRadar.tsx:104)
  - "{category.name} {category.weight} % WEIGHT {label} {relevantFactors.map(f => { const rCo} " type=submit(default) onClick=`{() => setExpanded(p => !p)}` (CategoryCard.tsx:29)
  - "{CATEGORY_LABELS[pathway.category] ??} {IMPACT_LABELS[pathway.impact]} {pathway.requiresAt" type=submit(default) onClick=`{() => setExpanded(e => !e)}` (PathwaySection.tsx:45)
  - "×" type=submit(default) onClick=`{() => setDismissed(true)}` (PathwaySection.tsx:253)
- **non-button click handlers**
  - <div> "{total > 0 && ( <div style={{ marginB} {total > 0 && ( <div style={{ display} DONE WHEN: {" onClick=`{e => e.stopPropagation()}` (RemediationPanel.tsx:143)
  - <div> "{field.label} {field.inputType === 'select' ? ( <se}" onClick=`{e => e.stopPropagation()}` (RemediationPanel.tsx:316)
  - <div> "{uploading ? '…' : '↑'} {uploading ? `Uploading ${doc.label}…} PDF or DOCX" onClick=`{e => e.stopPropagation()}` (RemediationPanel.tsx:366)
- **inputs**
  - select name=— id=— [cond] (RemediationPanel.tsx:321)
  - textarea name=— id=— placeholder="{field.placeholder}" [cond] (RemediationPanel.tsx:332)
  - {field.inputType} name=— id=— placeholder="{field.placeholder}" [cond] (RemediationPanel.tsx:340)
  - file name=— id={inputId} (RemediationPanel.tsx:367)
- **API calls**
  - POST `/api/case-profile/build` (page.tsx:108)
  - POST `/api/gap-analysis/run` (page.tsx:267)
  - POST `/api/analysis/run` (page.tsx:406)
  - POST `/api/answers` (RemediationPanel.tsx:95)
  - POST `/api/documents` (RemediationPanel.tsx:123)
- **programmatic navigation**
  - router.push → `/login?next=/gap-analysis` (page.tsx:153)

## `/generate/[applicationId]`

- file: `src/app/generate/[applicationId]/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `AcknowledgmentGate.tsx`, `PreGenerationConfirmation.tsx`, `ConsulateBriefing.tsx`, `NpsModal.tsx`
- **links**
  - /apply/story#voice ← "Add a sample →" [cond] (page.tsx:826)
- **buttons**
  - "Return to Investment Tab" type=submit(default) onClick=`{() => _router.push('/apply/investment')}` [cond] (page.tsx:751)
  - "Complete Required Fields →" type=submit(default) onClick=`{() => { const firstGap = validation.blockingGaps[` [cond] (page.tsx:780)
  - "✕" type=submit(default) onClick=`{() => setVoiceWarningDismissed(true)}` [cond] (page.tsx:831)
  - "Approve & Continue →" type=submit(default) onClick=`{handleApprove}` [cond] (page.tsx:945)
  - "Request Revision" type=submit(default) onClick=`{handleRevise}` [cond] (page.tsx:952)
  - "{downloading ? 'Generating Package…' }" type=submit(default) onClick=`{handleDownload}` disabled=`{downloading}` [cond] (page.tsx:1032)
  - "{downloading ? 'Preparing…' : 'Downlo}" type=submit(default) onClick=`{handleDownload}` disabled=`{downloading}` [cond] (page.tsx:1081)
  - "Retry Generation" type=submit(default) onClick=`{startGeneration}` [cond] (page.tsx:1120)
  - "Restart Generation" type=submit(default) onClick=`{startGeneration}` [cond] (page.tsx:1150)
  - "{submitting ? "Recording confirmation}" type=submit(default) onClick=`{handleConfirm}` disabled=`{!allChecked \|\| submitting}` (AcknowledgmentGate.tsx:162)
  - "Yes, update my total to $ {currentSum.toLocaleString()}" type=submit(default) onClick=`{handleAcceptNewTotal}` [cond] (PreGenerationConfirmation.tsx:385)
  - "No, I meant to enter a different number" type=submit(default) onClick=`{handleRevertEdit}` [cond] (PreGenerationConfirmation.tsx:396)
  - "{CONFIRM_LABEL}" type=submit(default) onClick=`{handleConfirm}` disabled=`{confirmDisabled}` (PreGenerationConfirmation.tsx:429)
  - "{NEEDS_FIXING_LABEL}" type=submit(default) onClick=`{handleNeedsFixing}` (PreGenerationConfirmation.tsx:442)
  - "Understood — confirm investment figures →" type=submit(default) onClick=`{onContinue}` (ConsulateBriefing.tsx:712)
  - "✕" type=submit(default) onClick=`{handleDismiss}` [cond] (NpsModal.tsx:111)
  - "{i}" type=submit(default) onClick=`{() => setScore(i)}` [cond] (NpsModal.tsx:124)
  - "{submitting ? 'Submitting…' : 'Submit}" type=submit(default) onClick=`{handleSubmit}` disabled=`{score === null \|\| submitting}` [cond] (NpsModal.tsx:172)
  - "Skip" type=submit(default) onClick=`{handleDismiss}` [cond] (NpsModal.tsx:185)
- **non-button click handlers**
  - <div> "{submitted ? ( <div className="text-c}" onClick=`{(e) => { if (e.target === e.currentTarget) handle` (NpsModal.tsx:77)
- **inputs**
  - checkbox name=— id=— [map] (AcknowledgmentGate.tsx:106)
  - text name=— id=— [map] (PreGenerationConfirmation.tsx:280)
  - textarea name=— id=— placeholder="Any feedback for us..." [cond] (NpsModal.tsx:150)
- **API calls**
  - GET `/api/generate/download/{…}` (page.tsx:156)
  - PATCH `/api/generate/documents/{…}` (page.tsx:322)
  - GET `/api/applications/{…}` (page.tsx:503)
  - POST `/api/generate/start` (page.tsx:392)
  - POST `/api/generate/run/{…}` (page.tsx:424)
  - POST `/api/generate/confirm` (page.tsx:447)
  - GET `/api/generate/validate/{…}` (page.tsx:528)
  - POST `/api/generate/acknowledge` (AcknowledgmentGate.tsx:61)
  - POST `/api/nps/submit` (NpsModal.tsx:41)
- **browser storage keys**: `{COOLDOWN_KEY}`
- **download / print**: URL.createObjectURL

## `/learn/e2-visa-business-types`

- file: `src/app/learn/e2-visa-business-types/page.tsx` · access: **public** · title: "What Businesses Qualify for an E-2 Visa?" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/how-much-to-invest-e2 ← "How Much Do You Need to Invest for an E-2 Visa?" (page.tsx:68)
  - /learn/e2-visa-denial-reasons ← "Why E-2 Visa Applications Get Denied" (page.tsx:69)
  - /quiz ← "Check your eligibility →" (page.tsx:71)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/learn/e2-visa-canada`

- file: `src/app/learn/e2-visa-canada/page.tsx` · access: **public** · title: "The E-2 Visa for Canadian Citizens" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/what-is-e2-visa ← "What is the E-2 Treaty Investor Visa?" (page.tsx:66)
  - /learn/toronto-consulate-e2 ← "The E-2 Visa Interview at Toronto Consulate" (page.tsx:67)
  - /quiz ← "Check your eligibility →" (page.tsx:69)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/learn/e2-visa-denial-reasons`

- file: `src/app/learn/e2-visa-denial-reasons/page.tsx` · access: **public** · title: "Why E-2 Visa Applications Get Denied" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/toronto-consulate-e2 ← "The E-2 Visa Interview at Toronto Consulate" (page.tsx:73)
  - /learn/how-much-to-invest-e2 ← "How Much Do You Need to Invest for an E-2 Visa?" (page.tsx:74)
  - /quiz ← "Check your eligibility →" (page.tsx:76)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/learn/how-much-to-invest-e2`

- file: `src/app/learn/how-much-to-invest-e2/page.tsx` · access: **public** · title: "How Much Do You Need to Invest for an E-2 Visa?" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/e2-visa-business-types ← "What Businesses Qualify for an E-2 Visa?" (page.tsx:71)
  - /learn/e2-visa-denial-reasons ← "Why E-2 Visa Applications Get Denied" (page.tsx:72)
  - /quiz ← "Check your eligibility →" (page.tsx:74)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/learn`

- file: `src/app/learn/page.tsx` · access: **public** · title: "Learn About the E-2 Visa — Articles & Answers" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`, `FaqWidget.tsx`, `FaqChat.tsx`, `animated-gradient-border.tsx`
- **links**
  - {article.href} ← "{article.title} {article.desc} Read article → {article.readTime}" [map] (page.tsx:90)
  - /quiz ← "Check your eligibility — it takes 10 minutes" (page.tsx:123)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)
  - /quiz ← "Get a personalised eligibility picture →" [map] [cond] (FaqChat.tsx:333)
- **buttons**
  - "{chip}" type=submit(default) onClick=`{() => handleSubmit(chip)}` [map] [cond] (FaqChat.tsx:307)
  - "→" type=submit(default) onClick=`{() => handleSubmit()}` disabled=`{!query.trim() \|\| isStreaming}` (FaqChat.tsx:406)
- **inputs**
  - text name=— id=— placeholder="{inputPlaceholder}" (FaqChat.tsx:381)
- **API calls**
  - POST `/api/faq/ask` (FaqChat.tsx:168)

## `/learn/toronto-consulate-e2`

- file: `src/app/learn/toronto-consulate-e2/page.tsx` · access: **public** · title: "The E-2 Visa Interview at Toronto Consulate" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/e2-visa-canada ← "The E-2 Visa for Canadian Citizens" (page.tsx:73)
  - /learn/e2-visa-denial-reasons ← "Why E-2 Visa Applications Get Denied" (page.tsx:74)
  - /quiz ← "Check your eligibility →" (page.tsx:76)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/learn/what-is-e2-visa`

- file: `src/app/learn/what-is-e2-visa/page.tsx` · access: **public** · title: "What is the E-2 Treaty Investor Visa?" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - /learn/how-much-to-invest-e2 ← "How Much Do You Need to Invest for an E-2 Visa?" (page.tsx:68)
  - /learn/e2-visa-denial-reasons ← "Why E-2 Visa Applications Get Denied" (page.tsx:69)
  - /quiz ← "Check your eligibility →" (page.tsx:71)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)

## `/login`

- file: `src/app/login/page.tsx` · access: **auth-page** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.signOut, auth.getSession, auth.setSession
- component files: `page.tsx`, `GenerationProgress.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (page.tsx:273)
  - /forgot-password ← "Reset password →" [cond] (page.tsx:302)
  - /signup ← "No account? Sign up free →" [cond] (page.tsx:305)
  - /forgot-password ← "Forgot password?" (page.tsx:360)
  - /signup ← "Sign up" (page.tsx:399)
- **forms**
  - onSubmit=`{handleLogin}` action=`—` (page.tsx:313)
- **inputs**
  - email name=— id=login-email required placeholder="your@email.com" (page.tsx:318)
  - password name=— id=login-password required placeholder="••••••••" (page.tsx:334)
  - checkbox name=— id=— (page.tsx:348)
- **API calls**
  - POST `/api/auth/login` (page.tsx:58)
  - POST `/api/track/session` (page.tsx:133)
- **programmatic navigation**
  - location.href = → `{next}` (page.tsx:138)
  - location.href = → `/quiz` (page.tsx:150)
  - location.href = → `/results` (page.tsx:162)
  - location.href = → `/simulator` (page.tsx:165)
  - location.href = → `/results` (page.tsx:168)
  - location.href = → `{section ? `/apply/${section}` : '/apply'}` (page.tsx:178)
  - location.href = → `{next}` (page.tsx:183)
- **browser storage keys**: `e2go_quiz_draft`

## `/market-analysis`

- file: `src/app/market-analysis/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `GenerationProgress.tsx`
- **buttons**
  - "{loading ? 'Analysing territory…' : '}" type=submit onClick=`—` disabled=`{loading}` (page.tsx:408)
  - "Print / PDF" type=submit(default) onClick=`{() => window.print()}` [cond] (page.tsx:442)
  - "Download PDF" type=submit(default) onClick=`{async () => { const zips = parseZips(form.zip); c` [cond] (page.tsx:445)
  - "↑ New analysis" type=submit(default) onClick=`{() => { setAnalysis(null); setError(''); window.s` [cond] (page.tsx:638)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:307)
- **inputs**
  - text name=— id=— placeholder="e.g. Sunrise Senior Care" (page.tsx:317)
  - select name=— id=— (page.tsx:337)
  - text name=— id=— placeholder="10001 or 10001, 10002, 10003" (page.tsx:362)
  - select name=— id=— (page.tsx:385)
- **API calls**
  - POST `/api/market-analysis` (page.tsx:223)
  - GET `/api/market-analysis?applicationId={…}` (page.tsx:262)
  - POST `/api/market-analysis/pdf` (page.tsx:448)
- **download / print**: window.print, URL.createObjectURL

## `/modules`

- file: `src/app/modules/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - redirect → `/pricing` (page.tsx:8)

## `/onboarding`

- file: `src/app/onboarding/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: useApplicationGate, auth.getUser
- component files: `page.tsx`, `ApplicationNotReadyScreen.tsx`, `AddFamilyMemberForm.tsx`, `TriageSectionRow.tsx`, `DocumentImportHub.tsx`, `CaseHeader.tsx`, `ProgressRing.tsx`
- **links**
  - /terms ← "Terms of Service" [new tab] [cond] (page.tsx:442)
  - /privacy ← "Privacy Policy" [new tab] [cond] (page.tsx:448)
  - /apply/security/principal ← "{familyMembers.map((m) => ( <TriageSe}" [cond] (page.tsx:550)
  - /apply/security/{…} ← "" [map] [cond] (page.tsx:557)
  - {cardHref(id)} ← "" [map] [cond] (page.tsx:630)
  - /case-profile ← "Open your case file {caseCompletion?.caseCode ? ` — ${cas} →" [cond] (page.tsx:651)
  - /case-profile ← "Back to case profile" (ApplicationNotReadyScreen.tsx:41)
  - {href} ← "{label} {badge && ( <span className="text-[10} {sourceChip ?? description} {progressPct !=" (TriageSectionRow.tsx:28)
  - {nextBestAction.href} ← "{nextBestAction.label} ~ {nextBestAction.estimateMin} min" [cond] (CaseHeader.tsx:80)
- **buttons**
  - "Connect me" type=submit(default) onClick=`{() => onRespond(true)}` (page.tsx:128)
  - "No thanks" type=submit(default) onClick=`{() => onRespond(false)}` (page.tsx:131)
  - "{label}" type=submit(default) onClick=`{() => !isDisabled && setStep(s)}` disabled=`{isDisabled}` [map] (page.tsx:375)
  - "Yes, keep me informed Unsubscribe anytime." type=submit(default) onClick=`{() => setCaslConsent(true)}` [cond] (page.tsx:458)
  - "No thanks Just essential updates." type=submit(default) onClick=`{() => setCaslConsent(false)}` [cond] (page.tsx:462)
  - "{savingConsent ? 'Saving…' : 'Continu}" type=submit(default) onClick=`{handleSaveConsent}` disabled=`{!isConsentValid \|\| savingConsent}` [cond] (page.tsx:470)
  - "+ Add a family member or co-investor" type=submit(default) onClick=`{() => setAddFormType('spouse')}` [cond] (page.tsx:523)
  - "Continue →" type=submit(default) onClick=`{() => setStep(3)}` [cond] (page.tsx:532)
  - "Continue →" type=submit(default) onClick=`{() => setStep(4)}` [cond] (page.tsx:569)
  - "Continue →" type=submit(default) onClick=`{handleReachStep5}` [cond] (page.tsx:606)
  - "Try again" type=submit(default) onClick=`{onRetry}` (ApplicationNotReadyScreen.tsx:26)
  - "{type === 'co_investor' ? 'Co-investo}" type=button onClick=`{() => setMemberType(type)}` [map] (AddFamilyMemberForm.tsx:68)
  - "Cancel" type=button onClick=`{onCancel}` (AddFamilyMemberForm.tsx:147)
  - "{saving ? 'Saving…' : 'Add person'}" type=button onClick=`{handleSubmit}` disabled=`{!isValid \|\| saving}` (AddFamilyMemberForm.tsx:150)
  - "Import from documents Upload a resume, FDD, passport, or birth certificate — for you or a " type=submit(default) onClick=`{() => setIsOpen(true)}` (DocumentImportHub.tsx:647)
  - "✕" type=submit(default) onClick=`{() => { reset(); setIsOpen(false); }}` (DocumentImportHub.tsx:690)
  - "+ Add files" type=submit(default) onClick=`{() => openFilePickerFor(opt.id)}` [map] [cond] (DocumentImportHub.tsx:733)
  - "✕" type=submit(default) onClick=`{() => removeFromQueue(item.id)}` [map] [cond] (DocumentImportHub.tsx:788)
  - "+ Add a family member" type=submit(default) onClick=`{() => setShowAddMember(true)}` [cond] (DocumentImportHub.tsx:805)
  - "{addingMember ? 'Adding…' : 'Add'}" type=submit(default) onClick=`{handleAddMember}` disabled=`{!newMemberName.trim() \|\| addingMember}` [cond] (DocumentImportHub.tsx:839)
  - "Cancel" type=submit(default) onClick=`{() => { setShowAddMember(false); setNewMemberName` [cond] (DocumentImportHub.tsx:847)
  - "Extract fields from {queue.length} file {queue.length !== 1 ? 's' : ''} →" type=submit(default) onClick=`{handleExtractAll}` [cond] (DocumentImportHub.tsx:859)
  - "Move to their section" type=submit(default) onClick=`{() => reassignOwner(item.id, m.matchedIsPrincipal` [map] [cond] (DocumentImportHub.tsx:1045)
  - "Review {merged.length} field {merged.length !== 1 ? 's' : ''} →" type=submit(default) onClick=`{() => setStage('reviewing')}` [cond] (DocumentImportHub.tsx:1062)
  - "Start over" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1069)
  - "{isChosen && <div style={{ width: '5p} {src.value} from {src.fileName}" type=submit(default) onClick=`{() => setConflictChoice(entryKey, src.value)}` [map] [cond] (DocumentImportHub.tsx:1130)
  - "{isManual && <div style={{ width: '5p} Enter manually" type=submit(default) onClick=`{() => setConflictChoice(entryKey, '__manual__')}` [map] [cond] (DocumentImportHub.tsx:1156)
  - "{isAccepted && ( <svg width="9" heigh} {field.label} {field.sources.length > 0 && ( <span " type=button onClick=`{() => toggleAccepted(entryKey)}` [map] [cond] (DocumentImportHub.tsx:1200)
  - "{unresolvedConflicts > 0 ? `Resolve $}" type=submit(default) onClick=`{handleApply}` disabled=`{applyCount === 0 \|\| unresolvedConflicts` [cond] (DocumentImportHub.tsx:1246)
  - "Select all non-conflicts" type=submit(default) onClick=`{() => { setAccepted(new Set(merged.filter(f => !f` [cond] (DocumentImportHub.tsx:1256)
  - "Start over" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1265)
  - "Close" type=submit(default) onClick=`{() => { reset(); setIsOpen(false); }}` [cond] (DocumentImportHub.tsx:1302)
  - "Import more documents" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1309)
  - "Try again" type=submit(default) onClick=`{reset}` [cond] (DocumentImportHub.tsx:1325)
- **inputs**
  - checkbox name=— id=— [cond] (page.tsx:440)
  - checkbox name=— id=— [cond] (page.tsx:446)
  - text name=— id=— (AddFamilyMemberForm.tsx:87)
  - text name=— id=— (AddFamilyMemberForm.tsx:96)
  - date name=— id=— (AddFamilyMemberForm.tsx:105)
  - text name=— id=— (AddFamilyMemberForm.tsx:114)
  - text name=— id=— (AddFamilyMemberForm.tsx:123)
  - select name=— id=— [cond] (AddFamilyMemberForm.tsx:133)
  - file name=— id=— (DocumentImportHub.tsx:703)
  - select name=— id=— [map] [cond] (DocumentImportHub.tsx:767)
  - text name=— id=— placeholder="Full name" [cond] (DocumentImportHub.tsx:815)
  - select name=— id=— [cond] (DocumentImportHub.tsx:826)
  - text name=— id=— placeholder="Type the correct value…" [map] [cond] (DocumentImportHub.tsx:1175)
- **API calls**
  - GET `/api/profile/family-members` (DocumentImportHub.tsx:281)
  - GET `/api/case/completion` (page.tsx:213)
  - POST `/api/consent/log` (page.tsx:272)
  - POST `/api/profile/family-members` (DocumentImportHub.tsx:339)
- **programmatic navigation**
  - router.push → `/login?next=/onboarding` (page.tsx:259)

## `/`

- file: `src/app/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `HomeClient.tsx`, `ComparisonSection.tsx`, `FaqWidgetHome.tsx`, `SectionNav.tsx`, `FaqChat.tsx`, `animated-gradient-border.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (HomeClient.tsx:18)
  - {href} ← "{label}" [map] (HomeClient.tsx:28)
  - /login ← "Log in" (HomeClient.tsx:32)
  - /quiz ← "Check eligibility" (HomeClient.tsx:33)
  - {href} ← "{label}" [map] [cond] (HomeClient.tsx:49)
  - /quiz ← "Check eligibility →" [cond] (HomeClient.tsx:52)
  - /quiz ← "Check my eligibility →" (HomeClient.tsx:141)
  - #compare ← "See how it works" (HomeClient.tsx:144)
  - /quiz ← "Check my eligibility →" (HomeClient.tsx:214)
  - /pricing ← "View pricing" (HomeClient.tsx:217)
  - {href} ← "{label}" [map] (HomeClient.tsx:236)
  - #{…} ← "{section.label} {active && ( <span className="absolut}" [map] (SectionNav.tsx:83)
  - /quiz ← "Check eligibility →" (SectionNav.tsx:101)
  - #{…} ← "{section.label}" [map] (SectionNav.tsx:114)
  - /quiz ← "Get a personalised eligibility picture →" [map] [cond] (FaqChat.tsx:333)
- **buttons**
  - "Toggle menu" type=submit(default) onClick=`{() => setMenuOpen(!menuOpen)}` (HomeClient.tsx:35)
  - "{teaserText \|\| "Ask anything about th} \| →" type=submit(default) onClick=`{() => openSheet()}` (FaqWidgetHome.tsx:161)
  - "×" type=submit(default) onClick=`{closeSheet}` (FaqWidgetHome.tsx:209)
  - "{chip}" type=submit(default) onClick=`{() => handleSubmit(chip)}` [map] [cond] (FaqChat.tsx:307)
  - "→" type=submit(default) onClick=`{() => handleSubmit()}` disabled=`{!query.trim() \|\| isStreaming}` (FaqChat.tsx:406)
- **non-button click handlers**
  - <div> "Ask E2go.app Free · instant answer Ask E2go.app Free · instant {teaserText \|\| "Ask anythin" onClick=`{closeSheet}` (FaqWidgetHome.tsx:182)
- **inputs**
  - text name=— id=— placeholder="{inputPlaceholder}" (FaqChat.tsx:381)
- **API calls**
  - POST `/api/faq/ask` (FaqChat.tsx:168)

## `/partner-access`

- file: `src/app/partner-access/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:92)
  - /dashboard ← "Go to Dashboard →" [cond] (page.tsx:165)
  - /dashboard ← "Go to Dashboard →" [cond] (page.tsx:194)
  - /login ← "Log in with a different account →" [cond] (page.tsx:209)
  - /dashboard ← "Return to Dashboard →" [cond] (page.tsx:235)
- **buttons**
  - "Accept Interview Prep Access →" type=submit(default) onClick=`{handleAccept}` [cond] (page.tsx:125)
- **API calls**
  - POST `/api/partner/accept` (page.tsx:46)
- **programmatic navigation**
  - router.replace → `/login?next={…}` (page.tsx:32)

## `/pricing`

- file: `src/app/pricing/page.tsx` · access: **public** · title: "E2go.app Pricing — E-2 Visa Application Package" · page-level auth: auth.getUser
- component files: `page.tsx`, `PricingClient.tsx`, `PricingCard.tsx`, `PromoCodeInput.tsx`, `animated-gradient-border.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (PricingClient.tsx:225)
  - /dashboard ← "Dashboard" [cond] (PricingClient.tsx:235)
  - /login ← "Sign In" [cond] (PricingClient.tsx:239)
  - /quiz ← "Get Started" (PricingClient.tsx:243)
  - /quiz ← "eligibility quiz" [cond] (PricingClient.tsx:272)
  - mailto:support@e2go.app ← "support@e2go.app" [external] (PricingClient.tsx:355)
- **buttons**
  - "{disabled ? disabledText : isSelected}" type=submit(default) onClick=`{() => !disabled && onSelect(id)}` disabled=`{disabled}` (PricingCard.tsx:63)
  - "Remove" type=button onClick=`{handleRemove}` (PromoCodeInput.tsx:57)
  - "Have a promo code?" type=button onClick=`{() => setExpanded(true)}` (PromoCodeInput.tsx:70)
  - "{applying ? "Checking…" : "Apply"}" type=button onClick=`{handleApply}` disabled=`{applying \|\| !inputValue.trim()}` (PromoCodeInput.tsx:103)
  - "×" type=button onClick=`{() => { setExpanded(false); setInputValue(""); se` (PromoCodeInput.tsx:123)
- **inputs**
  - text name=— id=— placeholder="PROMO CODE" (PromoCodeInput.tsx:83)
- **API calls**
  - HEAD `/api/stripe/checkout` (PricingClient.tsx:89)
  - POST `/api/stripe/create-checkout` (PricingClient.tsx:196)
  - POST `/api/promo/validate` (PromoCodeInput.tsx:24)
- **programmatic navigation**
  - router.push → `/signup` (PricingClient.tsx:187)
  - location.href = → `{data.url}` (PricingClient.tsx:209)
- **browser storage keys**: `e2go_quiz_result`, `e2go_selected_tier`

## `/pricing/success`

- file: `src/app/pricing/success/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **buttons**
  - "Back to Pricing" type=submit(default) onClick=`{() => router.push('/pricing')}` (page.tsx:144)
  - "{nextStep.label} →" type=submit(default) onClick=`{() => router.push(nextStep.href)}` (page.tsx:196)
  - "Go to Dashboard" type=submit(default) onClick=`{() => router.push('/dashboard')}` (page.tsx:204)
- **API calls**
  - POST `/api/stripe/verify-payment` (page.tsx:85)
- **programmatic navigation**
  - router.replace → `/simulator?purchase=success&session_id={…}` (page.tsx:94)
  - router.replace → `/simulator?purchase=success&session_id={…}` (page.tsx:111)
  - router.push → `/pricing` (page.tsx:145)
  - router.push → `{nextStep.href}` (page.tsx:197)
  - router.push → `/dashboard` (page.tsx:205)

## `/privacy`

- file: `src/app/privacy/page.tsx` · access: **public** · title: "Privacy Policy" · page-level auth: —
- component files: `page.tsx`, `PrivacyClient.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (PrivacyClient.tsx:10)
  - / ← "← Back to home" (PrivacyClient.tsx:18)
  - / ← "← Back to home" (PrivacyClient.tsx:219)

## `/quiz`

- file: `src/app/quiz/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:890)
  - / ← "E2go .app" (page.tsx:935)
  - / ← "E2go .app" (page.tsx:1031)
- **buttons**
  - "Start over" type=submit(default) onClick=`{() => { setStopCode(null); setCur(0); setAnswers(` (page.tsx:899)
  - "Find an attorney →" type=submit(default) onClick=`—` (page.tsx:918)
  - "{isSaving ? "Sending..." : "Send my r}" type=submit(default) onClick=`{handleEmailSubmit}` disabled=`{!email.includes("@") \|\| isSaving}` [cond] (page.tsx:998)
  - "Save & exit" type=button onClick=`{() => setShowEmailGate(true)}` (page.tsx:1042)
  - "{s}" type=button onClick=`{i < q.section_index ? () => { const firstQ = visi` disabled=`{i >= q.section_index}` [map] (page.tsx:1056)
  - "{c}" type=button onClick=`{() => { // Fix C: Treaty country validation if (!` [map] [cond] (page.tsx:1175)
  - "{o.text} {selectedIdx === i && <div style={{ w}" type=submit(default) onClick=`{() => handleSelectOpt(i)}` [map] [cond] (page.tsx:1213)
  - "{o.text} {sel && <div style={{ width: "7px", h}" type=submit(default) onClick=`{() => { // Mutual exclusion logic if (q.id === "Q` [map] [cond] (page.tsx:1250)
  - "Continue anyway" type=submit(default) onClick=`{() => { const nextIdx = cur + 1; if (nextIdx >= v` [cond] (page.tsx:1313)
  - "← Back" type=submit(default) onClick=`{() => { setCur(c => c - 1); setSelectedIdx(null);` [cond] (page.tsx:1347)
  - "Continue →" type=submit(default) onClick=`{handleMultiContinue}` [cond] (page.tsx:1360)
- **inputs**
  - text name=— id=quiz-full-name placeholder="Your full name" [cond] (page.tsx:959)
  - email name=— id=quiz-email placeholder="your@email.com" [cond] (page.tsx:968)
  - checkbox name=— id=— [cond] (page.tsx:984)
  - text(default) name=— id=— placeholder="Search your country..." [cond] (page.tsx:1134)
- **API calls**
  - POST `/api/profile/rebuild` (page.tsx:578)
  - POST `/api/email/results` (page.tsx:815)
- **programmatic navigation**
  - router.push → `/dashboard` (page.tsx:269)
  - router.push → `/dashboard` (page.tsx:290)
  - router.push → `/results?from=quiz` (page.tsx:541)
  - router.push → `/quiz/profile` (page.tsx:579)
- **browser storage keys**: `quiz_jump_to_id`, `e2go_quiz_draft`, `quiz_jump_to`, `quiz_return_to_results`, `e2go_quiz_result`

## `/quiz/profile`

- file: `src/app/quiz/profile/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:206)
- **buttons**
  - "{opt.text}" type=submit(default) onClick=`{() => handleSelect(opt.value)}` [map] (page.tsx:284)
  - "Skip" type=submit(default) onClick=`{handleSkip}` [cond] (page.tsx:333)
  - "{saving ? "Saving..." : current < tot}" type=submit(default) onClick=`{handleNext}` disabled=`{!canAdvance \|\| saving}` (page.tsx:358)
- **API calls**
  - POST `/api/profile/rebuild` (page.tsx:156)
- **programmatic navigation**
  - router.push → `/results?from=quiz` (page.tsx:157)
  - router.push → `/results?from=quiz` (page.tsx:165)
- **browser storage keys**: `e2go_quiz_profile`

## `/quiz/review`

- file: `src/app/quiz/review/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:145)
- **buttons**
  - "Start the quiz →" type=submit(default) onClick=`{() => router.push("/quiz")}` [cond] (page.tsx:162)
  - "{item.is_sub && ( <div style={{ fontS} {item.question} {formatAnswer(item.answer)} Change " type=button onClick=`{() => handleJumpToQuestion(item.id)}` [map] [cond] (page.tsx:178)
  - "{hasChanges ? "Confirm My Answers →" }" type=submit(default) onClick=`{handleConfirm}` [cond] (page.tsx:228)
- **programmatic navigation**
  - router.push → `/quiz` (page.tsx:108)
  - router.push → `/results` (page.tsx:112)
  - router.push → `/quiz` (page.tsx:163)
- **browser storage keys**: `e2go_quiz_draft`, `e2go_quiz_result`, `quiz_review_changed`, `quiz_jump_to_id`, `quiz_return_to_results`

## `/renewal/documents`

- file: `src/app/renewal/documents/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /renewal/intake ← "Back to intake" (page.tsx:172)
  - / ← "E2go.app" (page.tsx:176)
  - /case-profile ← "My case" (page.tsx:177)
  - /renewal/intake ← "Return to intake" [cond] (page.tsx:215)
- **buttons**
  - "{copied ? 'Copied' : 'Copy'}" type=submit(default) onClick=`{copy}` (page.tsx:45)
  - "Download .txt" type=submit(default) onClick=`{download}` (page.tsx:77)
  - "Generate documents" type=submit(default) onClick=`{handleGenerate}` disabled=`{intake?.status !== 'complete' && intake` [cond] (page.tsx:218)
  - "{TAB_LABELS[tab]}" type=submit(default) onClick=`{() => setActiveTab(tab)}` [map] [cond] (page.tsx:254)
  - "(no label)" type=— onClick=`—` [cond] (page.tsx:284)
  - "(no label)" type=— onClick=`—` [cond] (page.tsx:285)
  - "Regenerate" type=submit(default) onClick=`{handleGenerate}` disabled=`{generating}` [cond] (page.tsx:319)
- **API calls**
  - GET `/api/renewal/intake` (page.tsx:106)
  - POST `/api/renewal/generate` (page.tsx:133)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:108)
  - router.push → `/renewal` (page.tsx:109)
- **download / print**: URL.createObjectURL

## `/renewal/intake`

- file: `src/app/renewal/intake/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /renewal ← "← Back to renewal" (page.tsx:224)
  - /case-profile ← "My case" (page.tsx:258)
  - / ← "E2go.app" (page.tsx:267)
- **buttons**
  - "{opt.label} {opt.sub}" type=submit(default) onClick=`{() => setPath(opt.value)}` [map] (page.tsx:300)
  - "{opt.label}" type=submit(default) onClick=`{() => setAnswer(q.key, opt.value)}` [map] [cond] (page.tsx:371)
  - "Mark complete" type=submit(default) onClick=`{() => saveChanges({ status: 'complete' })}` disabled=`{!intake.path \|\| answeredCount < filtere` (page.tsx:425)
- **inputs**
  - text name=— id=— placeholder="Enter your answer" [map] [cond] (page.tsx:396)
  - textarea name=— id=— placeholder="Enter your answer" [map] [cond] (page.tsx:407)
- **API calls**
  - GET `/api/renewal/intake` (page.tsx:121)
  - GET `/api/renewal/baseline?applicationId={…}` (page.tsx:134)
  - PATCH `/api/renewal/intake` (page.tsx:155)
- **programmatic navigation**
  - router.push → `/renewal/documents` (page.tsx:165)

## `/renewal`

- file: `src/app/renewal/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `RenewalEntryClient.tsx`, `ComingSoonNotifyButton.tsx`
- **links**
  - /case-profile ← "My case" (RenewalEntryClient.tsx:54)
- **buttons**
  - "Coming Soon Renewal isn&apos;t open for new purchases yet — we&apos;re launching new appli" type=— onClick=`—` (RenewalEntryClient.tsx:150)
  - "Refresh to continue" type=submit(default) onClick=`{() => { setLoading(true); window.location.reload(` (RenewalEntryClient.tsx:155)
  - "{state === 'loading' ? 'Sending…' : s}" type=button onClick=`{handleClick}` disabled=`{state === 'loading'}` (ComingSoonNotifyButton.tsx:52)
- **API calls**
  - GET `/api/renewal/intake` (RenewalEntryClient.tsx:24)
  - POST `/api/coming-soon-interest` (ComingSoonNotifyButton.tsx:22)
- **programmatic navigation**
  - redirect → `/login?next=/renewal` (page.tsx:11)
  - redirect → `/renewal/intake` (page.tsx:36)
  - router.push → `/renewal/intake` (RenewalEntryClient.tsx:26)

## `/reset-password`

- file: `src/app/reset-password/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser, auth.updateUser
- component files: `page.tsx`
- **links**
  - / ← "E2go.app" (page.tsx:63)
  - /forgot-password ← "Request a new link →" (page.tsx:69)
  - / ← "E2go.app" (page.tsx:81)
  - /login ← "Back to Sign In →" (page.tsx:91)
  - / ← "E2go.app" (page.tsx:102)
  - /login ← "Back to Sign In" (page.tsx:154)
- **buttons**
  - "{status === 'loading' ? 'Updating...'}" type=submit onClick=`—` disabled=`{status === 'loading'}` (page.tsx:134)
- **forms**
  - onSubmit=`{handleReset}` action=`—` (page.tsx:114)
- **inputs**
  - password name=— id=— required placeholder="New password" (page.tsx:115)
  - password name=— id=— required placeholder="Confirm new password" (page.tsx:125)

## `/results`

- file: `src/app/results/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `FlagCard.tsx`, `DocumentPackagePreview.tsx`, `DocumentTabPreview.tsx`, `PromoCodeInput.tsx`
- **links**
  - / ← "E2go .app" (page.tsx:134)
  - /terms ← "Terms of Service" [cond] (page.tsx:153)
  - /login ← "Log in" (page.tsx:202)
  - / ← "E2go .app" (page.tsx:624)
  - /dashboard ← "Dashboard" [cond] (page.tsx:628)
  - /signup ← "Create an account to save your results and access your dashboard" [cond] (page.tsx:753)
  - /pricing ← "Investor Ready" (page.tsx:1239)
  - /pricing ← "Interview Ready" (page.tsx:1239)
  - mailto:support@e2go.app?subject=Partnership%20Foundation%20pricing ← "Contact Us for Partnership Pricing" [external] [cond] (page.tsx:1256)
  - /pricing ← "View Pricing & Add-ons →" [cond] (page.tsx:1296)
  - /fdd ← "Analyse an FDD →" [cond] (page.tsx:1384)
  - /fdd ← "{fddReceived ? "Analyse My FDD Now →"}" [cond] (page.tsx:1402)
- **buttons**
  - "← Back to quiz" type=submit(default) onClick=`{onBackToQuiz}` [cond] (page.tsx:142)
  - "{sending ? "Sending..." : "Send my re}" type=submit onClick=`—` disabled=`{sending \|\| !email \|\| !caslConsent}` [cond] (page.tsx:155)
  - "Or retake the quiz" type=submit(default) onClick=`{onBackToQuiz}` [cond] (page.tsx:160)
  - "Skip for now" type=submit(default) onClick=`{onDismiss}` (page.tsx:203)
  - "{creating ? "Creating account..." : "}" type=submit onClick=`—` disabled=`{creating}` (page.tsx:223)
  - "← Review or change my answers" type=submit(default) onClick=`{() => router.push("/quiz/review")}` (page.tsx:635)
  - "{checkoutLoading ? "Preparing checkou}" type=submit(default) onClick=`{() => handleCheckout('foundation')}` disabled=`{checkoutLoading}` [cond] (page.tsx:1263)
  - "{item.q} +" type=submit(default) onClick=`{() => setOpenFaq(openFaq === i ? null : i)}` [map] [cond] (page.tsx:1360)
  - "{addressed ? (isExpanded ? 'Hide deta}" type=submit(default) onClick=`{onToggle}` [cond] (FlagCard.tsx:238)
  - "{info.edit_label} →" type=submit(default) onClick=`{onRedirectToQuiz}` [cond] (FlagCard.tsx:256)
  - "{info.edit_label} →" type=submit(default) onClick=`{onRedirectToQuiz}` [cond] (FlagCard.tsx:273)
  - "{tab.label}" type=submit(default) onClick=`{() => setActiveTab(i)}` [map] (DocumentTabPreview.tsx:233)
  - "Remove" type=button onClick=`{handleRemove}` (PromoCodeInput.tsx:57)
  - "Have a promo code?" type=button onClick=`{() => setExpanded(true)}` (PromoCodeInput.tsx:70)
  - "{applying ? "Checking…" : "Apply"}" type=button onClick=`{handleApply}` disabled=`{applying \|\| !inputValue.trim()}` (PromoCodeInput.tsx:103)
  - "×" type=button onClick=`{() => { setExpanded(false); setInputValue(""); se` (PromoCodeInput.tsx:123)
- **non-button click handlers**
  - <div> "What to add {remediation.heading} {remediation.question} {addressed ? '✓ Sufficient detail" onClick=`{e => e.stopPropagation()}` [cond] (FlagCard.tsx:295)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:148)
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:214)
- **inputs**
  - email name=— id=results-email required placeholder="you@example.com" [cond] (page.tsx:150)
  - checkbox name=— id=— [cond] (page.tsx:152)
  - text name=— id=— required placeholder="First name" (page.tsx:216)
  - text name=— id=— required placeholder="Last name" (page.tsx:217)
  - password name=— id=— required placeholder="Password" (page.tsx:219)
  - password name=— id=— required placeholder="Confirm password" (page.tsx:221)
  - textarea name=— id=— placeholder="{remediation.placeholder}" [cond] (FlagCard.tsx:317)
  - text name=— id=— placeholder="PROMO CODE" (PromoCodeInput.tsx:83)
- **API calls**
  - POST `/api/email/resend-results` (page.tsx:116)
  - POST `/api/quiz/personalized-flags` (page.tsx:390)
  - GET `/api/case-profile/build` (page.tsx:416)
  - POST `/api/answers` (page.tsx:478)
  - POST `/api/checkout/initiate` (page.tsx:513)
  - POST `/api/promo/validate` (PromoCodeInput.tsx:24)
- **programmatic navigation**
  - router.push → `/quiz` (page.tsx:493)
  - location.href = → `/login?next=/results` (page.tsx:507)
  - location.href = → `/case-profile` (page.tsx:520)
  - location.href = → `{json.url}` (page.tsx:524)
  - router.push → `/quiz/review` (page.tsx:635)
  - router.push → `/quiz` (page.tsx:1337)
- **browser storage keys**: `e2go_quiz_result`, `e2go_quiz_identity`, `quiz_jump_to_id`, `quiz_return_to_results`

## `/retention/confirm-hold`

- file: `src/app/retention/confirm-hold/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - / ← "Return to E2go.app" (page.tsx:118)
- **buttons**
  - "{state === "working" ? "Keeping your }" type=submit(default) onClick=`{handleConfirm}` disabled=`{state === "working"}` [cond] (page.tsx:95)
- **API calls**
  - POST `/api/retention/confirm-hold` (page.tsx:31)

## `/score`

- file: `src/app/score/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **programmatic navigation**
  - redirect → `/results` (page.tsx:4)

## `/settings`

- file: `src/app/settings/page.tsx` · access: **auth** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `Breadcrumb.tsx`
- **links**
  - mailto:support@e2go.app ← "support@e2go.app" [external] (page.tsx:85)
  - /api/account/export ← "Export my data" [download] (page.tsx:98)
  - /dashboard ← "← Back to Dashboard" (page.tsx:236)
  - {item.href} ← "{item.label}" [map] [cond] (Breadcrumb.tsx:20)
- **buttons**
  - "Return to homepage" type=submit(default) onClick=`{() => router.push('/')}` (page.tsx:55)
  - "Delete my account" type=submit(default) onClick=`{() => setDeleteStep('confirm1')}` [cond] (page.tsx:134)
  - "Yes, I understand — continue" type=submit(default) onClick=`{() => setDeleteStep('confirm2')}` [cond] (page.tsx:148)
  - "Cancel" type=submit(default) onClick=`{() => setDeleteStep('idle')}` [cond] (page.tsx:154)
  - "Permanently delete everything" type=submit(default) onClick=`{handleDelete}` disabled=`{!confirmMatch}` [cond] (page.tsx:189)
  - "Cancel" type=submit(default) onClick=`{() => { setDeleteStep('idle'); setConfirmText('')` [cond] (page.tsx:206)
  - "Try again" type=submit(default) onClick=`{() => { setDeleteStep('idle'); setConfirmText('')` [cond] (page.tsx:225)
- **inputs**
  - text name=— id=— placeholder="delete my account" [cond] (page.tsx:169)
- **API calls**
  - POST `/api/account/delete` (page.tsx:23)
- **programmatic navigation**
  - router.push → `/` (page.tsx:56)

## `/signup`

- file: `src/app/signup/page.tsx` · access: **auth-page** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `AuthImageSlider.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (page.tsx:163)
  - / ← "E2go .app E-2 Visa Prep, Simplified." (page.tsx:194)
  - /login ← "Sign in →" [cond] (page.tsx:212)
  - /terms ← "E2go.app/terms" [new tab] (page.tsx:362)
  - /terms ← "Terms of Service" [new tab] (page.tsx:402)
  - /terms ← "Terms of Service" [new tab] (page.tsx:495)
  - /privacy ← "Privacy Policy" [new tab] (page.tsx:496)
  - /login ← "Sign in" (page.tsx:502)
- **buttons**
  - "Create Account" type=submit onClick=`—` disabled=`{!hasScrolledTerms \|\| !termsAccepted \|\| ` (page.tsx:475)
- **forms**
  - onSubmit=`{handleSignup}` action=`—` (page.tsx:218)
- **inputs**
  - text name=— id=signup-first-name required placeholder="First name" (page.tsx:224)
  - text name=— id=signup-last-name required placeholder="Last name" (page.tsx:239)
  - email name=— id=signup-email required placeholder="your@email.com" (page.tsx:256)
  - password name=— id=signup-password required placeholder="Min. 8 characters" (page.tsx:272)
  - password name=— id=signup-confirm-password required placeholder="Confirm your password" (page.tsx:290)
  - checkbox name=— id=terms-accept (page.tsx:377)
  - checkbox name=— id=casl-consent (page.tsx:424)
  - checkbox name=— id=outcomes-consent (page.tsx:440)
- **API calls**
  - POST `/api/auth/signup` (page.tsx:87)
  - POST `/api/auth/accept-terms` (page.tsx:130)

## `/simulator/case-file`

- file: `src/app/simulator/case-file/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `CaseFileSummary.tsx`, `InterviewBrief.tsx`, `GenerationProgress.tsx`
- **links**
  - /simulator/quick-start ← "Go to Quick Start →" (page.tsx:58)
  - {secondaryAction.href} ← "{secondaryAction.label}" [cond] (CaseFileSummary.tsx:256)
- **buttons**
  - "Continue →" type=submit(default) onClick=`{onContinue}` (CaseFileSummary.tsx:101)
  - "{continueLabel}" type=submit(default) onClick=`{onContinue}` (CaseFileSummary.tsx:252)
  - "{risk.risk.toUpperCase()} {risk.code} {risk.name} {expanded ? '▲' : '▼'}" type=submit(default) onClick=`{() => setExpanded(e => !e)}` (InterviewBrief.tsx:210)
- **API calls**
  - GET `/api/simulator/case-summary?applicationId={…}` (CaseFileSummary.tsx:69)
  - GET `/api/simulator/interview-prep?applicationId={…}` (InterviewBrief.tsx:347)
- **programmatic navigation**
  - router.push → `/login?next=/simulator` (page.tsx:25)
  - router.push → `/simulator/quick-start` (page.tsx:37)
  - router.push → `/simulator` (page.tsx:84)
- **browser storage keys**: `{cacheKey}`

## `/simulator/interview-day`

- file: `src/app/simulator/interview-day/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - {displayPost.website} ← "Official Consulate Website →" [new tab] [cond] (page.tsx:345)
  - {displayPost.appointmentUrl} ← "Schedule Appointment →" [new tab] [cond] (page.tsx:354)
  - {getEmbassyFinderUrl(treatyCountry \|\| '')} ← "Find My Consulate → usembassy.gov" [new tab] [cond] (page.tsx:385)
- **buttons**
  - "{post.city} {i === 0 && <span style={{ marginLeft}" type=submit(default) onClick=`{() => setSelectedPost(i)}` [map] [cond] (page.tsx:278)
  - "{rowContent}" type=button onClick=`{() => toggle(item.id)}` [map] (page.tsx:508)
  - "Print this guide" type=submit(default) onClick=`{() => window.print()}` (page.tsx:524)
- **download / print**: window.print

## `/simulator/outcome`

- file: `src/app/simulator/outcome/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **buttons**
  - "Dashboard" type=submit(default) onClick=`{() => router.push('/dashboard')}` (page.tsx:78)
  - "Review gap analysis →" type=submit(default) onClick=`{() => router.push('/gap-analysis')}` [cond] (page.tsx:82)
  - "{opt.label} {opt.desc}" type=button onClick=`{() => setOutcome(opt.value)}` [map] (page.tsx:109)
  - "{reason}" type=button onClick=`{() => setDenialReason(reason)}` [map] [cond] (page.tsx:165)
  - "{saving ? 'Saving…' : 'Save outcome'}" type=submit onClick=`—` disabled=`{saving}` [cond] (page.tsx:200)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:103)
- **inputs**
  - date name=— id=— [cond] (page.tsx:139)
  - text name=— id=— placeholder="e.g. US Consulate Toronto, US Embassy Ot" [cond] (page.tsx:150)
  - textarea name=— id=— placeholder="What surprised you? What questions were " [cond] (page.tsx:187)
- **API calls**
  - POST `/api/simulator/outcome` (page.tsx:41)
- **programmatic navigation**
  - router.push → `/dashboard` (page.tsx:78)
  - router.push → `/gap-analysis` (page.tsx:82)

## `/simulator`

- file: `src/app/simulator/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`, `CaseFileSummary.tsx`, `GenerationProgress.tsx`, `ConversationalSession.tsx`
- **links**
  - /simulator/interview-day ← "Interview Day Guide →" (page.tsx:887)
  - /dashboard ← "← Back to Dashboard" (page.tsx:890)
  - /simulator/interview-day ← "Interview Day Guide" (page.tsx:1986)
  - {needsAnalysisOnly ? '/gap-analysis' : '/apply'} ← "{needsAnalysisOnly ? 'Run AI analysis}" (page.tsx:2121)
  - /simulator/quick-start ← "Upload your documents instead →" [cond] (page.tsx:2150)
  - /dashboard ← "← Back to Dashboard" (page.tsx:2215)
  - {secondaryAction.href} ← "{secondaryAction.label}" [cond] (CaseFileSummary.tsx:256)
- **buttons**
  - "Refresh page" type=submit(default) onClick=`{() => window.location.reload()}` (page.tsx:673)
  - "{purchaseLoading ? 'Loading...' : 'Pu}" type=submit(default) onClick=`{onPurchase}` disabled=`{purchaseLoading}` [cond] (page.tsx:854)
  - "Text Type your answers" type=submit(default) onClick=`{onStartText}` disabled=`{loading}` [cond] (page.tsx:865)
  - "Voice Speak your answers {voiceDisabled && <span style={styles}" type=submit(default) onClick=`{onStartVoice}` disabled=`{loading \|\| voiceDisabled}` [cond] (page.tsx:874)
  - "{showHint ? '▾ Hide coach hint' : '▸ }" type=submit(default) onClick=`{() => setShowHint(h => !h)}` [cond] (page.tsx:986)
  - "Replay" type=submit(default) onClick=`{() => speakQuestion(question.text)}` [cond] (page.tsx:996)
  - "{loading ? 'Evaluating...' : 'Submit }" type=submit(default) onClick=`{onSubmit}` disabled=`{loading \|\| wordCount < 10}` [cond] (page.tsx:1023)
  - "{followUpLoading ? 'Generating follow}" type=submit(default) onClick=`{onGetFollowUp}` disabled=`{followUpLoading}` [cond] (page.tsx:1074)
  - "{isLastQuestion ? 'Complete session →}" type=submit(default) onClick=`{onNext}` [cond] (page.tsx:1083)
  - "(no label)" type=submit(default) onClick=`—` disabled=`{transcribing}` [cond] (page.tsx:1257)
  - "Use this answer →" type=submit(default) onClick=`{onSubmit}` disabled=`{loading}` [cond] (page.tsx:1289)
  - "Record again" type=submit(default) onClick=`{() => { setRecordedText(''); onAnswerChange(''); ` [cond] (page.tsx:1292)
  - "{followUpLoading ? 'Generating follow}" type=submit(default) onClick=`{onGetFollowUp}` disabled=`{followUpLoading}` [cond] (page.tsx:1329)
  - "{isLastQuestion ? 'Complete session →}" type=submit(default) onClick=`{onNext}` [cond] (page.tsx:1338)
  - "{isExpanded ? 'Close ↑' : (isResolved}" type=submit(default) onClick=`{onToggleExpand}` [cond] (page.tsx:1402)
  - "Print / Save as PDF" type=submit(default) onClick=`{() => window.print()}` [cond] (page.tsx:1859)
  - "Retry" type=submit(default) onClick=`{onRetryCoaching}` [cond] (page.tsx:1907)
  - "Start another session" type=submit(default) onClick=`{onStartNew}` (page.tsx:1983)
  - "Back to Dashboard" type=submit(default) onClick=`{onBackToDashboard}` (page.tsx:1989)
  - "Continue →" type=submit(default) onClick=`{onContinue}` (CaseFileSummary.tsx:101)
  - "{continueLabel}" type=submit(default) onClick=`{onContinue}` (CaseFileSummary.tsx:252)
  - "{muted ? '🔇' : '🔊'}" type=submit(default) onClick=`{() => setMuted(m => !m)}` (ConversationalSession.tsx:701)
  - "End session" type=submit(default) onClick=`{handleEndSession}` (ConversationalSession.tsx:704)
  - "♪ Test speakers" type=submit(default) onClick=`{handleTestSpeaker}` [cond] (ConversationalSession.tsx:747)
  - "Yes, heard it" type=submit(default) onClick=`{() => { setSpeakerConfirmPending(false); setSpeak` [cond] (ConversationalSession.tsx:758)
  - "No — try again" type=submit(default) onClick=`{() => setSpeakerConfirmPending(false)}` [cond] (ConversationalSession.tsx:761)
  - "🎙 Test microphone" type=submit(default) onClick=`{handleTestMic}` [cond] (ConversationalSession.tsx:774)
  - "Done →" type=submit(default) onClick=`{handleMicTestDone}` [cond] (ConversationalSession.tsx:784)
  - "Begin interview →" type=submit(default) onClick=`{handleBeginInterview}` [cond] (ConversationalSession.tsx:802)
  - "Try again →" type=submit(default) onClick=`{handleRetry}` [cond] (ConversationalSession.tsx:850)
  - "Skip introduction →" type=submit(default) onClick=`{handleSkipIntro}` [cond] (ConversationalSession.tsx:851)
  - "■ Done speaking" type=submit(default) onClick=`{handleManualStop}` [cond] (ConversationalSession.tsx:861)
  - "{showHint ? '▾ Hide coach hint' : '▸ }" type=submit(default) onClick=`{() => setShowHint(h => !h)}` [cond] (ConversationalSession.tsx:888)
  - "{micBlocked ? 'Retry microphone →' : }" type=submit(default) onClick=`{handleRetry}` [cond] (ConversationalSession.tsx:928)
  - "{isLastQuestion ? 'Skip & finish sess}" type=submit(default) onClick=`{handleSkip}` [cond] (ConversationalSession.tsx:931)
  - "{isLastQuestion ? 'Complete session →}" type=submit(default) onClick=`{advance}` [cond] (ConversationalSession.tsx:948)
  - "↻ Replay question" type=submit(default) onClick=`{handleReplay}` [cond] (ConversationalSession.tsx:956)
  - "■ Done speaking" type=submit(default) onClick=`{handleManualStop}` [cond] (ConversationalSession.tsx:958)
  - "Skip →" type=submit(default) onClick=`{handleSkip}` [cond] (ConversationalSession.tsx:960)
- **non-button click handlers**
  - <div> "Correction note Clarify what you meant or note what you&apos;ll say differently. This is s" onClick=`{e => e.stopPropagation()}` [cond] (page.tsx:1468)
- **inputs**
  - textarea name=— id=— placeholder="Take your time. Answer as you would in t" [cond] (page.tsx:1010)
  - textarea name=— id=— placeholder="Your answer will appear here after recor" [cond] (page.tsx:1283)
  - textarea name=— id=— placeholder="e.g. I misspoke — the actual figure in m" [cond] (page.tsx:1478)
- **API calls**
  - GET `/api/simulator/voice-status` (page.tsx:189)
  - POST `/api/stripe/grant-simulator-sessions` (page.tsx:223)
  - POST `/api/stripe/create-checkout` (page.tsx:251)
  - POST `/api/simulator/follow-up` (page.tsx:338)
  - POST `/api/simulator/evaluate` (page.tsx:589)
  - POST `/api/simulator/coaching-report` (page.tsx:536)
  - POST `/api/simulator/transcribe` (ConversationalSession.tsx:507)
  - POST `/api/answers` (page.tsx:1742)
  - GET `/api/simulator/case-summary?applicationId={…}` (CaseFileSummary.tsx:69)
- **programmatic navigation**
  - router.push → `/login` (page.tsx:99)
  - location.href = → `{url}` (page.tsx:263)
  - router.push → `/dashboard` (page.tsx:802)
- **download / print**: window.print

## `/simulator/prep-kit`

- file: `src/app/simulator/prep-kit/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - {source.where} ← "{source.section} {source.what} {source.step} Fill in →" [map] (page.tsx:759)
  - /apply/upload ← "Upload your documents →" (page.tsx:862)
  - /dashboard ← "← Back to Dashboard" (page.tsx:882)
  - /apply/story ← "Continue your case file →" [cond] (page.tsx:1334)
- **buttons**
  - "{number} {title} {subtitle} ›" type=submit(default) onClick=`{() => setOpen((v) => !v)}` (page.tsx:115)
  - "Print / Save as PDF" type=submit(default) onClick=`{() => window.print()}` [cond] (page.tsx:1070)
  - "Download PDF" type=submit(default) onClick=`{() => window.open("/api/simulator/prep-kit/pdf", ` [cond] (page.tsx:1085)
  - "{generating ? "Generating…" : kit ? "}" type=submit(default) onClick=`{() => generate(Boolean(kit))}` disabled=`{generating \|\| (!kit && requirements !==` (page.tsx:1102)
  - "Generate my dossier" type=submit(default) onClick=`{() => generate(false)}` [cond] (page.tsx:1370)
- **API calls**
  - GET `/api/simulator/prep-kit` (page.tsx:920)
  - POST `/api/simulator/prep-kit` (page.tsx:941)
- **programmatic navigation**
  - window.open → `/api/simulator/prep-kit/pdf` (page.tsx:1086)
- **download / print**: window.print

## `/simulator/quick-start`

- file: `src/app/simulator/quick-start/page.tsx` · access: **paid** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: auth.getUser
- component files: `page.tsx`
- **links**
  - /simulator/case-file?applicationId={…} ← "Skip straight to your Prepare guide →" [cond] (page.tsx:533)
  - /simulator ← "← Back to simulator" (page.tsx:696)
- **buttons**
  - "{uploading ? (isReturningUser ? 'Upda}" type=submit(default) onClick=`{handleStart}` disabled=`{!canSubmit}` (page.tsx:670)
  - "Return to simulator" type=submit(default) onClick=`{() => router.push('/simulator')}` [cond] (page.tsx:748)
  - "{confirming ? 'Preparing your case…' }" type=submit(default) onClick=`{handleConfirm}` disabled=`{confirming}` (page.tsx:896)
  - "Skip to preparation guide" type=submit(default) onClick=`{() => confirmedAppId && router.push(`/simulator/c` (page.tsx:917)
  - "Drop files here or browse PDF or DOCX — cover letter and/or business plan" type=button onClick=`{onClick}` (page.tsx:1024)
  - "×" type=submit(default) onClick=`{(e) => { e.stopPropagation(); onRemove(file.id); ` (page.tsx:1065)
- **non-button click handlers**
  - <DropZone> "{files.length > 0 && ( <div style={{ }" onClick=`{() => fileInputRef.current?.click()}` (page.tsx:630)
- **inputs**
  - file name=— id=— (page.tsx:637)
  - {type} name=— id=— placeholder="{placeholder}" (page.tsx:991)
  - select name=— id=— (page.tsx:1003)
  - select name=— id=— [cond] (page.tsx:1055)
  - text name=— id=— placeholder="{placeholder ?? '—'}" [cond] (page.tsx:1143)
- **API calls**
  - POST `/api/simulator/quick-start` (page.tsx:257)
  - POST `/api/documents` (page.tsx:293)
  - POST `/api/documents/extract` (page.tsx:400)
- **programmatic navigation**
  - router.push → `/login?next=/simulator/quick-start` (page.tsx:111)
  - router.push → `/simulator/case-file?applicationId={…}` (page.tsx:281)
  - router.push → `/simulator/case-file?applicationId={…}` (page.tsx:388)
  - router.push → `/simulator` (page.tsx:749)
  - router.push → `/simulator/case-file?applicationId={…}` (page.tsx:918)

## `/support`

- file: `src/app/support/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /dashboard ← "Back to dashboard →" (page.tsx:58)
  - /dashboard ← "← Back to dashboard" (page.tsx:73)
  - mailto:support@e2go.app ← "Or email directly" [external] (page.tsx:149)
- **buttons**
  - "{submitting ? 'Sending…' : 'Send mess}" type=submit onClick=`—` disabled=`{submitting \|\| !subject.trim() \|\| !messa` (page.tsx:142)
- **forms**
  - onSubmit=`{handleSubmit}` action=`—` (page.tsx:87)
- **inputs**
  - select name=— id=— (page.tsx:93)
  - text name=— id=— required placeholder="Brief description of your issue" (page.tsx:108)
  - textarea name=— id=— required placeholder="Describe the issue in detail. Include an" (page.tsx:123)
- **API calls**
  - POST `/api/support/submit` (page.tsx:30)

## `/terms-required`

- file: `src/app/terms-required/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - /terms ← "E2go.app/terms" [new tab] (page.tsx:187)
  - /terms ← "Terms of Service" [new tab] (page.tsx:234)
  - /terms ← "Read full Terms of Service" (page.tsx:293)
  - /dashboard ← "← Back to dashboard" (page.tsx:308)
- **buttons**
  - "{accepting ? "Recording acceptance...}" type=submit(default) onClick=`{handleAccept}` disabled=`{!hasScrolledTerms \|\| !termsAccepted \|\| ` (page.tsx:270)
- **inputs**
  - checkbox name=— id=terms-accept (page.tsx:209)
- **API calls**
  - POST `/api/auth/accept-terms` (page.tsx:43)
- **programmatic navigation**
  - router.push → `{next}` (page.tsx:59)

## `/terms`

- file: `src/app/terms/page.tsx` · access: **public** · title: "Terms of Service" · page-level auth: —
- component files: `page.tsx`, `TermsClient.tsx`
- **links**
  - / ← "E2go .app E-2 Visa Prep, Simplified." (TermsClient.tsx:44)
  - {returnTo} ← "← Back" (TermsClient.tsx:55)
  - {returnTo} ← "← Back" (TermsClient.tsx:314)

## `/unsubscribe`

- file: `src/app/unsubscribe/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`
- **links**
  - / ← "Return to E2go.app" (page.tsx:117)
- **buttons**
  - "{state === "working" ? "Unsubscribing}" type=submit(default) onClick=`{handleUnsubscribe}` disabled=`{state === "working"}` [cond] (page.tsx:94)
- **API calls**
  - POST `/api/email/unsubscribe` (page.tsx:30)

## `/verify`

- file: `src/app/verify/page.tsx` · access: **public** · title: "E2go.app — U.S. E-2 Treaty Investor Visa Preparation" · page-level auth: —
- component files: `page.tsx`, `AuthImageSlider.tsx`
- **links**
  - /quiz ← "Or retake the quiz" (page.tsx:155)
- **buttons**
  - "{resending ? 'Sending...' : 'Resend r}" type=submit(default) onClick=`{handleResend}` disabled=`{resending}` [cond] (page.tsx:130)
- **API calls**
  - POST `/api/email/results` (page.tsx:84)
- **programmatic navigation**
  - router.replace → `/results?session={…}` (page.tsx:75)
- **browser storage keys**: `e2go_quiz_result`, `e2go_quiz_identity`

