const clinics = [
    'care clinic',
    'healthcare group',
    'care corp',
    'care corporation',
    'healthcare corporation',
];

function search_clinics_v1(search, clinics) {
    const sorted_clinics = [];

    // exact match
    const exact_matches = clinics.filter(clinic => clinic === search);
    clinics = clinics.filter(clinic => clinic !== search);
    sorted_clinics.push(...exact_matches);

    // substring matches
    const substring_matches = clinics.filter(clinic => clinic.includes(search));
    clinics = clinics.filter(clinic => !clinic.includes(search));
    sorted_clinics.push(...substring_matches);

    // everything else
    sorted_clinics.push(...clinics);

    return sorted_clinics;
}

function search_clinics_v2(search, clinics) {
    const exact_matches = [];
    const start_matches = [];
    const remaining_clinics = [];

    clinics.forEach(clinic => {
        if (clinic === search) {
            exact_matches.push(clinic);
        } else if (clinic.startsWith(search)) {
            start_matches.push(clinic);
        } else {
            remaining_clinics.push(clinic);
        }
    });

    const remaining_clinics_hamming_distance = remaining_clinics.map(clinic => {
        return {
            name: clinic,
            distance: hamming_distance(search, clinic),
        };
    });

    return [...exact_matches, ...start_matches, ...remaining_clinics_hamming_distance.sort(sort_hamming_distance).map(clinic => clinic.name)];
}

function sort_hamming_distance(a, b) {
    return a.distance - b.distance;
}

function hamming_distance(s1, s2) {
    let distance = 0;
    const search_characters = s1.split('');
    const clinic_characters = s2.split('');
    for (let i = 0; i < search_characters.length; i++) {
        if (i > clinic_characters.length) break;
        if (search_characters[i] !== clinic_characters[i]) {
            distance++;
        }
    }
    return distance;
}

// console.log(JSON.stringify(search_clinics_v2('care corp', clinics)) == JSON.stringify(['care corp', 'healthcare corporation', 'healthcare group']));

// console.log(search_clinics_v2('care corp', clinics));

console.log(JSON.stringify(search_clinics_v2('care corp', clinics)) == JSON.stringify(['care corp', 'care corporation', 'care clinic', 'healthcare group', 'healthcare corporation']));
