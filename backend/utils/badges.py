def assign_badges(criteria):
    badges = []
    for key, value in criteria.items():
        if value:
            badges.append(f"Badge for {key}")
    return badges
