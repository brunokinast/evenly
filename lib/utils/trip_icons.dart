import 'package:flutter/material.dart';

/// Available icons for trips with their display data.
class TripIcon {
  final String name;
  final IconData icon;

  const TripIcon(this.name, this.icon);
}

/// List of available trip icons.
const tripIcons = [
  TripIcon('luggage', Icons.luggage_rounded),
  TripIcon('flight', Icons.flight_rounded),
  TripIcon('beach', Icons.beach_access_rounded),
  TripIcon('camping', Icons.cabin_rounded),
  TripIcon('restaurant', Icons.restaurant_rounded),
  TripIcon('home', Icons.home_rounded),
  TripIcon('celebration', Icons.celebration_rounded),
  TripIcon('sports', Icons.sports_soccer_rounded),
  TripIcon('music', Icons.music_note_rounded),
  TripIcon('shopping', Icons.shopping_bag_rounded),
  TripIcon('car', Icons.directions_car_rounded),
  TripIcon('boat', Icons.sailing_rounded),
  TripIcon('mountain', Icons.terrain_rounded),
  TripIcon('city', Icons.location_city_rounded),
  TripIcon('work', Icons.work_rounded),
  TripIcon('school', Icons.school_rounded),
];

/// Gets the icon data for a trip by its icon name.
IconData getTripIcon(String? iconName) {
  final icon = tripIcons.firstWhere(
    (i) => i.name == iconName,
    orElse: () => tripIcons.first,
  );
  return icon.icon;
}
