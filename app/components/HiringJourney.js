import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const Step = ({ index, title, sub, done, active, last, cta, onPress }) => (
  <View style={styles.step}>
    <View style={styles.rail}>
      <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color={COLORS.white} />
        ) : (
          <Text style={[styles.dotText, active && { color: COLORS.white }]}>{index}</Text>
        )}
      </View>
      {!last && <View style={[styles.line, done && styles.lineDone]} />}
    </View>

    <View style={[styles.stepBody, !last && { paddingBottom: SPACING.md }]}>
      <Text style={[styles.stepTitle, !done && !active && { color: COLORS.gray[500] }]}>{title}</Text>
      <Text style={styles.stepSub}>{sub}</Text>
      {active && cta && (
        <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{cta}</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

/**
 * Shown on the owner home until they have an active agreement.
 * Walks them through find → offer → agreement with live counts.
 */
const HiringJourney = ({
  openJobs,
  newApplicants,
  pendingOffers,
  acceptedOffers,
  unsignedHire, // { driver_id, driver } — accepted offer with no agreement yet
  awaitingSignature, // agreements the driver hasn't signed
  navigation,
}) => {
  const step1Done = openJobs > 0 || pendingOffers > 0 || acceptedOffers > 0;
  const step2Done = acceptedOffers > 0;
  const current = !step1Done ? 1 : !step2Done ? 2 : 3;

  const step1Sub = step1Done
    ? [
        openJobs > 0 && plural(openJobs, 'job open', 'jobs open'),
        newApplicants > 0 && plural(newApplicants, 'new applicant', 'new applicants'),
      ].filter(Boolean).join(' · ') || 'Drivers found'
    : 'Post a job or browse verified drivers near you';

  const step2Sub = step2Done
    ? plural(acceptedOffers, 'offer accepted', 'offers accepted')
    : pendingOffers > 0
      ? `${plural(pendingOffers, 'offer', 'offers')} waiting for a reply`
      : 'Send a formal offer to a driver you like';

  const step3Sub = awaitingSignature > 0
    ? `Waiting for the driver to sign (${awaitingSignature})`
    : unsignedHire
      ? `Set terms with ${unsignedHire.driver?.firstname || 'your driver'} — daily amount, days off, start date`
      : 'Unlocks the digital logbook and earnings tracking';

  // Applicants waiting outrank everything — that's where hires are lost
  const showApplicantsBanner = newApplicants > 0;

  return (
    <View>
      {showApplicantsBanner && (
        <TouchableOpacity
          style={styles.banner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('My Jobs')}
        >
          <View style={styles.bannerIcon}>
            <Ionicons name="people" size={18} color={COLORS.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {plural(newApplicants, 'driver applied', 'drivers applied')} to your jobs
            </Text>
            <Text style={styles.bannerSub}>Review them before another owner does</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Step
          index={1}
          title="Find a driver"
          sub={step1Sub}
          done={step1Done}
          active={current === 1}
          cta="Post a job"
          onPress={() => navigation.navigate('CreateJobPost')}
        />
        <Step
          index={2}
          title="Send an offer"
          sub={step2Sub}
          done={step2Done}
          active={current === 2}
          cta={pendingOffers > 0 ? 'Track offers' : 'Browse drivers'}
          onPress={() =>
            pendingOffers > 0
              ? navigation.navigate('SentOffers')
              : navigation.navigate('AllDrivers', { showAll: true })
          }
        />
        <Step
          index={3}
          title="Sign agreement & track cash"
          sub={step3Sub}
          done={false}
          active={current === 3}
          last
          cta={awaitingSignature > 0 ? 'View agreements' : unsignedHire ? 'Create agreement' : null}
          onPress={() =>
            awaitingSignature > 0
              ? navigation.navigate('Agreements')
              : navigation.navigate('CreateAgreement', {
                  driverId: unsignedHire.driver_id,
                  driverName: `${unsignedHire.driver?.firstname || ''} ${unsignedHire.driver?.lastname || ''}`.trim(),
                  driverImage: unsignedHire.driver?.profile_image,
                })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successLight,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.gray[900] },
  bannerSub: { fontSize: FONTS.sizes.xs, color: COLORS.gray[700], marginTop: 2 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  step: { flexDirection: 'row', gap: SPACING.sm },
  rail: { alignItems: 'center', width: 26 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: { backgroundColor: COLORS.secondary },
  dotActive: { backgroundColor: COLORS.primary },
  dotText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.gray[500] },
  line: { flex: 1, width: 2, backgroundColor: COLORS.gray[200], marginVertical: 2 },
  lineDone: { backgroundColor: COLORS.secondary },
  stepBody: { flex: 1, paddingTop: 3 },
  stepTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  stepSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  ctaText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.white },
});

export default memo(HiringJourney);
