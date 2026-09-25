from sklearn.cluster import KMeans
from typing import Tuple, List
import numpy as np

class ClusteringService:
    def cluster_passengers(self, locations: List[Tuple[float, float]], k: int) -> Tuple[List[Tuple[float, float]], List[int]]:
        if not locations:
            return [], []
            
        n_samples = len(locations)
        k = min(k, n_samples)
        
        X = np.array(locations)
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        labels = kmeans.fit_predict(X)
        
        centroids = [tuple(c) for c in kmeans.cluster_centers_]
        return centroids, labels.tolist()
