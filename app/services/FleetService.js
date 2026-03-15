import supabase from "../lib/supabase"; // adjust to your supabase client path

// ─── VEHICLES ────────────────────────────────────────────────────────────────

/**
 * Fetch all vehicles owned by the current user
 */
export async function getMyVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single vehicle by ID
 */
export async function getVehicleById(vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Register a new vehicle for the current owner
 * @param {Object} vehicleData - form data from AddCarScreen
 * @param {string} userId - the ID of the user registering the vehicle
 */
export async function registerVehicle(vehicleData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(
    "Registering vehicle for user ID:",
    user?.id,
    " Supabase user:",
    supabase.auth.getUser(),
  );

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      ...vehicleData,
      owner_id: user?.id,
      status: "available",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing vehicle
 */
export async function updateVehicle(vehicleId, updates) {
  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", vehicleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a vehicle (only if not actively assigned)
 */
export async function deleteVehicle(vehicleId) {
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId);

  if (error) throw error;
}

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

/**
 * Fetch all assignments for the owner's vehicles, with driver profile info
 */

export async function getMyAssignments() {
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select(
      `
      *,
      vehicle:vehicles(id, make, model, year, registration_number, vehicle_type, color),
      driver:profiles!vehicle_assignments_driver_id_fkey(id, firstname, lastname, email, phone, profile_image)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch active assignments for a specific vehicle
 */
export async function getVehicleAssignments(vehicleId) {
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select(
      `
      *,
      vehicle:vehicles(id, make, model, year, registration_number, vehicle_type, color),
      driver:profiles!vehicle_assignments_driver_id_fkey(id, firstname, lastname, email, phone, profile_image)
    `,
    )
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Assign a vehicle to a driver
 * @param {Object} assignmentData - { vehicle_id, driver_id, job_title, start_date, end_date, notes }
 */
export async function assignVehicleToDriver(assignmentData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mark vehicle as assigned
  await supabase
    .from("vehicles")
    .update({ status: "assigned" })
    .eq("id", assignmentData.vehicle_id);

  const { data, error } = await supabase
    .from("vehicle_assignments")
    .insert({
      ...assignmentData,
      assigned_by: user.id,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * End/cancel an assignment and free the vehicle
 */
export async function endAssignment(assignmentId, vehicleId) {
  const { error } = await supabase
    .from("vehicle_assignments")
    .update({
      status: "completed",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", assignmentId);

  if (error) throw error;

  // Check if vehicle has any other active assignments
  const { data: activeAssignments } = await supabase
    .from("vehicle_assignments")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active");

  if (!activeAssignments?.length) {
    await supabase
      .from("vehicles")
      .update({ status: "available" })
      .eq("id", vehicleId);
  }
}

// ─── DRIVER SIDE ─────────────────────────────────────────────────────────────

/**
 * Fetch all active vehicles assigned to the current driver
 */
export async function getMyAssignedVehicles() {
  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select(
      `
      *,
      vehicle:vehicles(*),
      driver:profiles!vehicle_assignments_driver_id_fkey(id, firstname, lastname, email, phone, profile_image)
    `,
    )
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Fetch available (unassigned) vehicles for the owner — used in assignment picker
 */
export async function getAvailableVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("status", "available")
    .order("make");

  if (error) throw error;
  return data;
}

/**
 * Search for drivers by name/email — used in assignment picker
 * Assumes you have a `profiles` table or use auth.users metadata
 */
export async function searchDrivers(query) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("job_interests")
    .select(
      `
      id,
      status,
      driver:driver_profiles!job_interests_driver_id_fkey(
        id,
        user_id,
        profile:profiles!driver_profiles_user_id_fkey(
          id, firstname, lastname, email, phone, profile_image
        )
      ),
      job_post:job_posts!job_interests_job_post_id_fkey(
        id, title, owner_id
      )
    `,
    )
    .eq("status", "accepted")
    .eq("job_post.owner_id", user.id)
    .limit(50);

  if (error) throw error;

  // Group accepted jobs per driver
  const driverMap = new Map();

  data
    .filter((item) => item.job_post !== null)
    .forEach((item) => {
      const profile = item.driver?.profile;
      if (!profile) return;

      const driverId = item.driver.user_id;

      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          id: driverId,
          driver_profile_id: item.driver.id,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          phone: profile.phone,
          profile_image: profile.profile_image,
          accepted_jobs: [], // list of jobs accepted by this driver
        });
      }

      // Push each accepted job into the driver's list
      driverMap.get(driverId).accepted_jobs.push({
        id: item.job_post.id,
        title: item.job_post.title,
      });
    });

  const unique = Array.from(driverMap.values());

  if (!query.trim()) return unique;
  const q = query.toLowerCase();
  return unique.filter(
    (d) =>
      d.firstname?.toLowerCase().includes(q) ||
      d.lastname?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q),
  );
}
