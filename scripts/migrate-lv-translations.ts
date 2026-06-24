/**
 * Firestore migration: Add _lv (Latvian) translations to all CMS content documents.
 * Run with: npx tsx scripts/migrate-lv-translations.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize with default credentials (use GOOGLE_APPLICATION_CREDENTIALS env var)
// Or if running from Firebase project, it will auto-detect
initializeApp();

const db = getFirestore();

async function migrateContentHero() {
  const ref = db.doc('content/hero');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/hero not found'); return; }

  const data = snap.data()!;
  const update: Record<string, any> = {
    mainTitle_lv: 'Populāras procedūras',
  };

  // Migrate slides with _lv fields
  if (data.slides && Array.isArray(data.slides)) {
    const slides = data.slides.map((slide: any) => ({
      ...slide,
      title_lv: slide.title_lv || translateHeroSlide(slide.title),
      description_lv: slide.description_lv || translateHeroSlideDesc(slide.description),
    }));
    update.slides = slides;
  }

  await ref.update(update);
  console.log('✅ content/hero — LV translations added');
}

function translateHeroSlide(title: string): string {
  const map: Record<string, string> = {
    'Биоревитализация губ': 'Lūpu biorevitalizācija',
    'Лифтинг процедура': 'Liftinga procedūra',
    'Полинуклеотиды': 'Polinukleotīdi',
    'Anti Acne программа': 'Anti Acne programma',
    'Мезотерапия глаз': 'Acu mezoterapija',
    'Мезотерапия': 'Mezoterapija',
    'Meso Wharton': 'Meso Wharton',
  };
  return map[title] || title;
}

function translateHeroSlideDesc(desc: string): string {
  const map: Record<string, string> = {
    'Глубокое увлажнение и естественное омоложение нежной кожи губ без лишнего объема.': 'Dziļa mitrināšana un dabiska lūpu ādas atjaunošana bez liekas tilpuma.',
    'Эффективная подтяжка контура лица и восстановление упругости кожи.': 'Efektīva sejas kontūras pievilkšana un ādas elastības atjaunošana.',
    'Активация собственных ресурсов кожи для восстановления сияния и молодости.': 'Ādas pašu resursu aktivizēšana mirdzuma un jaunības atjaunošanai.',
    'Индивидуальные протоколы способны ввести в ремиссию самую проблемную кожу.': 'Individuāli protokoli, kas spēj ievest remisijā pat visprobelmatiskāko ādu.',
    'Прощайте, темные круги и отеки! Специальный коктейль для нежной кожи вокруг глаз.': 'Ardievu, tumšie loki un pietūkums! Īpašs kokteilis maigajai acu zonai.',
    'Перезагрузка молодости. Активирует собственные стволовые клетки кожи, возвращая ей плотность.': 'Jaunības pārstartēšana. Aktivizē ādas cilmes šūnas, atjaunojot tās blīvumu.',
  };
  return map[desc] || desc;
}

async function migrateContentAbout() {
  const ref = db.doc('content/about');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/about not found'); return; }

  await ref.update({
    title_lv: 'Kosmetoloģe',
    subtitle_lv: 'Kompleksa pieeja jaunībai un jūsu ādas veselībai',
    text_lv: 'Es esmu Anastasija Bukina, kosmetoloģe ar augstāko medicīnisko izglītību Latvijas Universitātē, specialitāte — medicīnas māsa.',
    text2_lv: 'Manā praksē kosmetoloģija nav tikai procedūras, bet dziļa medicīniskā analīze. Esmu pārliecināta, ka patiess rezultāts ir iespējams tikai tad, kad problēmu skatāmies kompleksi, ņemot vērā iekšējos un ārējos faktorus.',
    buttonText_lv: 'Uzzināt vairāk',
  });

  // Also update stats labels if they exist
  const data = snap.data()!;
  if (data.stats && Array.isArray(data.stats)) {
    const stats = data.stats.map((s: any) => ({
      ...s,
      label_lv: s.label_lv || translateStatLabel(s.label),
    }));
    await ref.update({ stats });
  }

  console.log('✅ content/about — LV translations added');
}

function translateStatLabel(label: string): string {
  const map: Record<string, string> = {
    'лет опыта': 'gadu pieredze',
    'довольных клиентов': 'apmierinātu klientu',
  };
  return map[label] || label;
}

async function migrateContentFaq() {
  const ref = db.doc('content/faq');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/faq not found'); return; }

  const data = snap.data()!;
  const update: Record<string, any> = {
    mainTitle_lv: 'Bieži uzdotie jautājumi',
  };

  if (data.items && Array.isArray(data.items)) {
    const faqTranslations: Record<string, { q: string; a: string }> = {
      'Какие противопоказания к инъекционным процедурам?': {
        q: 'Kādas ir kontrindikācijas injekciju procedūrām?',
        a: 'Grūtniecība un zīdīšana; Onkoloģiskas slimības; Akūtas infekcijas un iekaisuma procesi; Alerģija pret preparāta komponentiem; Asins recēšanas traucējumi; Autoimūnas slimības; Herpes; Tieksme uz keloīdu rētu veidošanos',
      },
      'Какие рекомендации после инъекционных процедур?': {
        q: 'Kādi ir ieteikumi pēc injekciju procedūrām?',
        a: 'Pirmās 3 dienas: izvairieties no alkohola un asas ēdiena. 3–5 dienu laikā: izslēdziet agresīvus kosmētikas līdzekļus. Obligāti uzklājiet SPF 50. Procedūras dienā neuzklājiet dekoratīvo kosmētiku. 3–7 dienas izvairieties no pirts, baseina, solārija.',
      },
      'Какой период восстановления после инъекционных процедур?': {
        q: 'Kāds ir atveseļošanās periods pēc injekciju procedūrām?',
        a: 'Rehabilitācijas periods ir atkarīgs no izvēlētās metodikas. Pēc injekciju procedūrām dažas dienas var saglabāties neliels pietūkums un apsārtums. Papulas pēc mezoterapijas izzūd 4 dienu laikā.',
      },
      'Больно ли делать процедуру биоревитализации/мезотерапии?': {
        q: 'Vai biorevitalizācija/mezoterapija ir sāpīga?',
        a: 'Pacienta komforts ir mana prioritāte. Es izmantoju kvalitatīvu aplikācijas anestēziju, tāpēc visas procedūras ir maksimāli nesāpīgas un komfortablas.',
      },
      'Что такое примерка процедуры увеличения губ?': {
        q: 'Kas ir lūpu palielināšanas procedūras izmēģinājums?',
        a: 'Ja jūs šaubāties, vai apjoms jums piestāv, baidāties no procedūras vai vēlaties "pielaikot" rezultātu — lūpu biorevitalizācija jums noteikti piestāvēs. Tā ir droša mitrināšanas procedūra ar vieglu apjomu uz nelielu laiku.',
      },
      'Как подготовиться к биоревитализации/мезотерапии?': {
        q: 'Kā sagatavoties biorevitalizācijai/mezoterapijai?',
        a: 'Dažas dienas iepriekš izslēdziet alkoholu un asins recēšanas preparātus. 2 nedēļas iepriekš — dziļos pīlingus. Ierodieties bez grima.',
      },
    };

    const items = data.items.map((faq: any) => {
      const tr = faqTranslations[faq.question];
      return {
        ...faq,
        question_lv: faq.question_lv || (tr ? tr.q : faq.question),
        answer_lv: faq.answer_lv || (tr ? tr.a : faq.answer),
      };
    });
    update.items = items;
  }

  await ref.update(update);
  console.log('✅ content/faq — LV translations added');
}

async function migrateContentCta() {
  const ref = db.doc('content/cta');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/cta not found'); return; }

  await ref.update({
    title_lv: 'Vai esat gatavi pārveidot savu ādu?',
    subtitle_lv: 'Pierakstieties uz sākotnējo konsultāciju jau šodien un saņemiet individuālu kopšanas plānu kā dāvanu.',
    buttonText_lv: 'Pierakstīties tagad',
  });
  console.log('✅ content/cta — LV translations added');
}

async function migrateContentServicesSection() {
  const ref = db.doc('content/services_section');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/services_section not found'); return; }

  await ref.update({
    label_lv: 'Mūsu pakalpojumi',
    title_lv: 'Estētiskā kosmetoloģija',
    subtitle_lv: 'Profesionāli ādas risinājumi: no dziļas attīrīšanas līdz inovatīvām injekciju atjaunošanas metodēm.',
    learnMoreText_lv: 'Uzzināt vairāk',
    viewAllText_lv: 'Skatīt visus pakalpojumus',
    detailButtonText_lv: 'Uzzināt vairāk',
  });
  console.log('✅ content/services_section — LV translations added');
}

async function migrateContentHeader() {
  const ref = db.doc('content/header');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/header not found, creating...'); return; }

  const data = snap.data()!;
  const update: Record<string, any> = {
    bookingButtonText_lv: 'Pierakstīties',
    bookingButtonTextMobile_lv: 'Pierakstīties online',
  };

  if (data.navItems && Array.isArray(data.navItems)) {
    const navMap: Record<string, string> = {
      'Главная': 'Sākums',
      'Обучение': 'Apmācība',
      'Магазин': 'Veikals',
      'Услуги': 'Pakalpojumi',
    };
    const navItems = data.navItems.map((item: any) => ({
      ...item,
      name_lv: item.name_lv || navMap[item.name] || item.name,
    }));
    update.navItems = navItems;
  }

  await ref.update(update);
  console.log('✅ content/header — LV translations added');
}

async function migrateContentFooter() {
  const ref = db.doc('content/footer');
  const snap = await ref.get();
  if (!snap.exists) { console.log('⚠️  content/footer not found'); return; }

  const data = snap.data()!;
  const update: Record<string, any> = {
    brandDescription_lv: 'Estētiskā kosmetoloģija un profesionāla kopšana.\nAnastasija Bukina, kosmetoloģe\n(ID: 59850068090)',
    contactsTitle_lv: 'Kontakti',
    scheduleTitle_lv: 'Darba laiks',
    scheduleWeekdays_lv: 'P - Pk: 09:00 - 20:00',
    scheduleWeekends_lv: 'S - Sv: pēc iepriekšēja pieraksta',
    infoTitle_lv: 'Informācija',
    copyright_lv: '© {year} SKINLAB. Visas tiesības aizsargātas.',
    madeWith_lv: 'Izstrādāts ar ❤️',
  };

  if (data.infoLinks && Array.isArray(data.infoLinks)) {
    const linkTranslations: Record<string, string> = {
      'Юридическая информация': 'Juridiskā informācija',
      'Политика конфиденциальности': 'Privātuma politika',
      'Правила предоставления услуг': 'Pakalpojumu sniegšanas noteikumi',
      'Политика использования файлов cookie': 'Sīkdatņu lietošanas politika',
    };
    const infoLinks = data.infoLinks.map((link: any) => ({
      ...link,
      name_lv: link.name_lv || linkTranslations[link.name] || link.name,
    }));
    update.infoLinks = infoLinks;
  }

  await ref.update(update);
  console.log('✅ content/footer — LV translations added');
}

async function migrateServices() {
  const snap = await db.collection('services').get();
  if (snap.empty) { console.log('⚠️  No services found'); return; }

  const serviceTranslations: Record<string, { title: string; description: string }> = {
    'mesotherapy': {
      title: 'Mezoterapija',
      description: 'Ādas jaunināšana un mitrināšana, ievadot individuāli piemērotus aktīvu vielu kokteiļus.',
    },
    'biorevitalization': {
      title: 'Biorevitalizācija',
      description: 'Dziļa ādas mitrināšana ar hialuronskābi dabiskai atjaunošanai un spīdumam.',
    },
    'biostimulation': {
      title: 'Biostimulācija',
      description: 'Kolagēna sintēzes un ādas pašatjaunošanās procesu stimulēšana.',
    },
    'skincare': {
      title: 'Ādas kopšana',
      description: 'Profesionāla ādas attīrīšana un kopšana veselīgai un mirdzošai ādai.',
    },
    'complex': {
      title: 'Kompleksās programmas',
      description: 'Individuāli izstrādātas vairāku etapu procedūru programmas maksimālam rezultātam.',
    },
    'peels': {
      title: 'Pīlingi',
      description: 'Ķīmiskā eksfoliācija ādas tekstūras, toņa un kopējā izskata uzlabošanai.',
    },
    'consultation': {
      title: 'Konsultācija',
      description: 'Profesionāla ādas un estētiskā stāvokļa izvērtēšana ar individuālu kopšanas plānu.',
    },
    'lip-augmentation': {
      title: 'Lūpu palielināšana',
      description: 'Lūpu apjoma un formas korekcija ar drošiem filleru preparātiem dabiskam rezultātam.',
    },
    'anti-acne': {
      title: 'Anti Acne programma',
      description: 'Individuāli protokoli problemātiskas ādas ārstēšanai un remisijas sasniegšanai.',
    },
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const tr = serviceTranslations[docSnap.id];
    
    const update: Record<string, any> = {};
    
    if (tr) {
      if (!data.title_lv) update.title_lv = tr.title;
      if (!data.description_lv) update.description_lv = tr.description;
    }

    // Translate treatments
    if (data.treatments && Array.isArray(data.treatments)) {
      const hasAnyLv = data.treatments.some((t: any) => t.name_lv);
      if (!hasAnyLv) {
        const treatments = data.treatments.map((t: any) => ({
          ...t,
          name_lv: t.name_lv || t.name, // Keep original if no translation available
          description_lv: t.description_lv || t.description,
        }));
        update.treatments = treatments;
      }
    }

    if (Object.keys(update).length > 0) {
      await docSnap.ref.update(update);
      console.log(`  ✅ services/${docSnap.id} — LV translations added`);
    } else {
      console.log(`  ⏭️  services/${docSnap.id} — already has LV translations`);
    }
  }
  console.log('✅ All services — LV translations done');
}

async function main() {
  console.log('🚀 Starting Latvian (LV) translation migration...\n');

  await migrateContentHero();
  await migrateContentAbout();
  await migrateContentFaq();
  await migrateContentCta();
  await migrateContentServicesSection();
  await migrateContentHeader();
  await migrateContentFooter();
  await migrateServices();

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

main().catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
