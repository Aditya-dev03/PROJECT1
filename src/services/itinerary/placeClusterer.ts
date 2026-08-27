import { RankedPlace, PlaceCluster } from './itineraryTypes';
import { calculateHaversineDistanceKm } from './destinationResolver';

export const placeClusterer = {
  /**
   * Clusters places into k spatial clusters (e.g., k=3 for a 3-day trip)
   * using coordinate-based k-means / distance-pivot clustering.
   */
  clusterPlaces(places: RankedPlace[], targetClusters: number = 3): PlaceCluster[] {
    if (!places || places.length === 0) {
      return [];
    }

    // Determine optimal cluster count (avoid artificial tiny clusters when place count is low)
    // Cities naturally divide into 3-5 macro regions. Cap macro clusters at 5.
    let numClusters = Math.min(targetClusters, 5);
    if (places.length < numClusters * 3 && numClusters > 1) {
      numClusters = Math.max(1, Math.floor(places.length / 3));
    }
    numClusters = Math.min(numClusters, places.length);

    if (numClusters <= 1) {
      const centroidLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
      const centroidLon = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;
      return [
        {
          clusterId: 'cluster-0',
          name: 'Central Cluster',
          centroid: { latitude: centroidLat, longitude: centroidLon },
          places,
          radiusKm: this.computeClusterRadiusKm(centroidLat, centroidLon, places),
        },
      ];
    }

    // Step 1: Initialize seeds by choosing distant pivot points
    const centroids: Array<{ latitude: number; longitude: number }> = [];
    centroids.push({ latitude: places[0].latitude, longitude: places[0].longitude });

    while (centroids.length < numClusters) {
      let furthestPlace = places[0];
      let maxMinDist = -1;

      for (const p of places) {
        let minDistToAnyCentroid = Infinity;
        for (const c of centroids) {
          const dist = calculateHaversineDistanceKm(c.latitude, c.longitude, p.latitude, p.longitude);
          if (dist < minDistToAnyCentroid) {
            minDistToAnyCentroid = dist;
          }
        }
        if (minDistToAnyCentroid > maxMinDist) {
          maxMinDist = minDistToAnyCentroid;
          furthestPlace = p;
        }
      }
      centroids.push({ latitude: furthestPlace.latitude, longitude: furthestPlace.longitude });
    }

    // Step 2: Assign places to nearest centroid (2 iterations for refinement)
    let assignments: RankedPlace[][] = centroids.map(() => []);

    for (let iter = 0; iter < 3; iter++) {
      assignments = centroids.map(() => []);

      for (const p of places) {
        let closestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < centroids.length; i++) {
          const dist = calculateHaversineDistanceKm(
            centroids[i].latitude,
            centroids[i].longitude,
            p.latitude,
            p.longitude
          );
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }
        assignments[closestIdx].push(p);
      }

      // Recalculate centroids
      for (let i = 0; i < centroids.length; i++) {
        const clusterGroup = assignments[i];
        if (clusterGroup.length > 0) {
          const avgLat = clusterGroup.reduce((sum, p) => sum + p.latitude, 0) / clusterGroup.length;
          const avgLon = clusterGroup.reduce((sum, p) => sum + p.longitude, 0) / clusterGroup.length;
          centroids[i] = { latitude: avgLat, longitude: avgLon };
        }
      }
    }

    // Format output clusters
    const clusters: PlaceCluster[] = [];
    const regionNames = ['North Region', 'Central Region', 'South Region', 'East Region', 'West Region'];

    for (let i = 0; i < centroids.length; i++) {
      const clusterPlaces = assignments[i];
      if (clusterPlaces.length > 0) {
        clusters.push({
          clusterId: `cluster-${i + 1}`,
          name: regionNames[i % regionNames.length],
          centroid: centroids[i],
          places: clusterPlaces,
          radiusKm: this.computeClusterRadiusKm(centroids[i].latitude, centroids[i].longitude, clusterPlaces),
        });
      }
    }

    return clusters;
  },

  computeClusterRadiusKm(
    centroidLat: number,
    centroidLon: number,
    places: RankedPlace[]
  ): number {
    let maxDist = 0;
    for (const p of places) {
      const dist = calculateHaversineDistanceKm(centroidLat, centroidLon, p.latitude, p.longitude);
      if (dist > maxDist) maxDist = dist;
    }
    return Math.round(maxDist * 10) / 10;
  },

  arePlacesGeographicallyCompatible(
    placeA: { latitude: number; longitude: number },
    placeB: { latitude: number; longitude: number },
    maxDistanceKm: number = 30
  ): boolean {
    const dist = calculateHaversineDistanceKm(
      placeA.latitude,
      placeA.longitude,
      placeB.latitude,
      placeB.longitude
    );
    return dist <= maxDistanceKm;
  },
};
