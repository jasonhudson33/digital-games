# Migrate room state when it enters the application

Catan and Monopoly room state is migrated through a versioned Module immediately after loading from any Adapter. This keeps active older rooms playable while preventing transport Implementations and gameplay views from accumulating compatibility defaults.
