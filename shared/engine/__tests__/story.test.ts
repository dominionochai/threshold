import { describe, expect, it } from "vitest";
import { nearestNeighborhood, parseAgeList, parseStory } from "../story";

describe("parseStory", () => {
  it("reads needs, ages and a neighborhood from her own words", () => {
    const story = parseStory("We got evicted today and the kids haven't eaten. My son is 4 years old and my daughter is 9 years old. We're in Mott Haven.");
    expect(story.needs).toEqual(["food", "bed", "legal"]);
    expect(story.ages).toEqual([4, 9]);
    expect(story.location).toBe("Mott Haven");
    expect(story.needsAges).toBe(false);
  });

  it("asks for ages instead of guessing them", () => {
    const story = parseStory("I have two kids and we need somewhere to sleep.");
    expect(story.ages).toEqual([]);
    expect(story.needsAges).toBe(true);
    expect(story.needs).toEqual(["bed"]);
  });

  it("does not count the speaker's own age as a child", () => {
    expect(parseStory("I'm 31 years old and my baby has a fever").ages).toEqual([0]);
    expect(parseStory("I'm 16 years old and I need food").ages).toEqual([]);
  });

  it("reads months and number words", () => {
    expect(parseStory("my six year old and a 8 month old baby").ages.sort()).toEqual([0, 6]);
  });

  it("flags danger with the right number, and 911 wins over 988", () => {
    expect(parseStory("my son can't breathe").emergency).toBe("911");
    expect(parseStory("I want to die").emergency).toBe("988");
    expect(parseStory("I took too many pills, an overdose, I want to die").emergency).toBe("911");
    expect(parseStory("we need food").emergency).toBeNull();
  });

  it("returns nothing for words it does not understand", () => {
    expect(parseStory("hello")).toEqual({ needs: [], ages: [], needsAges: false, location: null, emergency: null });
  });
});

describe("parseAgeList", () => {
  it("reads a short answer like '4 and nine'", () => {
    expect(parseAgeList("4 and nine")).toEqual([4, 9]);
    expect(parseAgeList("12, 30")).toEqual([12]);
  });
});

describe("nearestNeighborhood", () => {
  it("snaps to the closest known neighborhood", () => {
    expect(nearestNeighborhood({ lat: 40.809, lng: -73.923 })?.name).toBe("Mott Haven");
  });
  it("says nothing outside New York City", () => {
    expect(nearestNeighborhood({ lat: 34.05, lng: -118.24 })).toBeNull();
  });
});
